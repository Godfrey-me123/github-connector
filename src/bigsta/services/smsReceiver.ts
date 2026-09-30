import { supabase } from './supabase';
import {
  ExtractedPayment,
  computeSmsHash,
  detectNetwork,
  extractPaymentFields,
  isParsedPayment,
} from '../utils/smsFields';

export type { ExtractedPayment };
export { extractPaymentFields, detectNetwork, computeSmsHash };

export const SMS_TABLE = 'sms_logs';

export type SmsReviewStatus = 'UNREVIEWED' | 'REVIEWED' | 'IGNORED';
export type SmsProcessingState = 'PARSED' | 'PARSE_FAILED';

export interface SmsTransaction {
  id: string;
  sms_hash: string;
  sender: string;
  raw_sms: string;
  received_at: string;
  device_id: string;
  network: string | null;
  amount: number | null;
  reference: string | null;
  receiver: string | null;
  balance: number | null;
  transaction_id: string | null;
  payer_name: string | null;
  payer_phone: string | null;
  status: SmsReviewStatus;
  processing_state: SmsProcessingState;
  source: string;
  created_at?: string;
}

export interface SmsDiagnostics {
  receiverRegisteredAt: string | null;
  nativeInterfaceDetected: boolean;
  lastSmsReceivedAt: string | null;
  lastSmsSender: string | null;
  lastSmsSavedAt: string | null;
  lastSupabaseInsertAt: string | null;
  lastSupabaseInsertId: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  pendingOutbox: number;
  totalReceived: number;
  totalSaved: number;
  totalFailed: number;
}

const DIAG_KEY = 'bigsta_sms_receiver_diagnostics';
const OUTBOX_KEY = 'bigsta_sms_receiver_outbox';
const DEVICE_KEY = 'bigsta_sms_device_id';
const DIAG_EVENT = 'bigsta:sms-diagnostics';

const emptyDiagnostics = (): SmsDiagnostics => ({
  receiverRegisteredAt: null,
  nativeInterfaceDetected: false,
  lastSmsReceivedAt: null,
  lastSmsSender: null,
  lastSmsSavedAt: null,
  lastSupabaseInsertAt: null,
  lastSupabaseInsertId: null,
  lastErrorAt: null,
  lastError: null,
  pendingOutbox: 0,
  totalReceived: 0,
  totalSaved: 0,
  totalFailed: 0,
});

function getNativeInterface(): any {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.AndroidInterface || w.Android || w.JSInterface || null;
}

export function getSmsDiagnostics(): SmsDiagnostics {
  try {
    const raw = localStorage.getItem(DIAG_KEY);
    const parsed = raw ? { ...emptyDiagnostics(), ...JSON.parse(raw) } : emptyDiagnostics();
    parsed.nativeInterfaceDetected = Boolean(getNativeInterface());
    parsed.pendingOutbox = readOutbox().length;
    return parsed;
  } catch {
    return emptyDiagnostics();
  }
}

function updateDiagnostics(patch: Partial<SmsDiagnostics>) {
  const next = { ...getSmsDiagnostics(), ...patch };
  try {
    localStorage.setItem(DIAG_KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new CustomEvent(DIAG_EVENT));
}

export function subscribeSmsDiagnostics(callback: () => void): () => void {
  window.addEventListener(DIAG_EVENT, callback);
  return () => window.removeEventListener(DIAG_EVENT, callback);
}

function recordError(message: string) {
  console.error('[BIGsta SMS Receiver]', message);
  updateDiagnostics({ lastError: message, lastErrorAt: new Date().toISOString() });
}

export function getDeviceId(): string {
  const native = getNativeInterface();
  if (native && typeof native.getDeviceId === 'function') {
    try {
      const id = String(native.getDeviceId() || '').trim();
      if (id) return id;
    } catch {}
  }
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `dev_${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

interface OutboxItem {
  sender: string;
  rawSms: string;
  receivedAt: string;
  attempts: number;
}

function readOutbox(): OutboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeOutbox(items: OutboxItem[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}

export interface SmsSaveResult {
  ok: boolean;
  duplicate?: boolean;
  id?: string;
  error?: string;
}

async function persistSms(sender: string, rawSms: string, receivedAt: string): Promise<SmsSaveResult> {
  if (!supabase) return { ok: false, error: 'Supabase client not configured' };

  const deviceId = getDeviceId();
  const smsHash = await computeSmsHash(sender, rawSms, receivedAt);
  const fields = extractPaymentFields(sender, rawSms);
  const parsed = isParsedPayment(fields);

  const row = {
    sms_hash: smsHash,
    sender,
    raw_sms: rawSms,
    received_at: receivedAt,
    device_id: deviceId,
    network: fields.network,
    amount: fields.amount,
    reference: fields.reference,
    receiver: fields.receiver,
    balance: fields.balance,
    transaction_id: fields.transactionId,
    payer_name: fields.payerName,
    payer_phone: fields.payerPhone,
    status: 'UNREVIEWED' as SmsReviewStatus,
    processing_state: (parsed ? 'PARSED' : 'PARSE_FAILED') as SmsProcessingState,
    source: 'bigsta_apk',
  };

  const { data, error } = await supabase.from(SMS_TABLE).insert(row).select('id').single();

  if (error) {
    if (error.code === '23505') return { ok: true, duplicate: true };
    return { ok: false, error: `${error.code || 'ERR'}: ${error.message}` };
  }
  if (!data?.id) return { ok: false, error: 'Insert returned no row; record not confirmed' };
  return { ok: true, id: data.id };
}

export async function receiveNativeSms(senderInput: string, rawInput: string, timestamp?: string | number): Promise<SmsSaveResult> {
  const now = new Date().toISOString();
  const sender = String(senderInput || '').trim() || 'UNKNOWN';
  const rawSms = String(rawInput ?? '');
  const parsedTs = timestamp !== undefined && timestamp !== null && timestamp !== '' ? new Date(Number(timestamp) || timestamp) : null;
  const receivedAt = parsedTs && !Number.isNaN(parsedTs.getTime()) ? parsedTs.toISOString() : now;

  const diag = getSmsDiagnostics();
  updateDiagnostics({
    lastSmsReceivedAt: now,
    lastSmsSender: sender,
    totalReceived: diag.totalReceived + 1,
  });

  if (!rawSms.trim()) {
    recordError(`Rejected empty SMS body from ${sender}`);
    updateDiagnostics({ totalFailed: getSmsDiagnostics().totalFailed + 1 });
    return { ok: false, error: 'Empty SMS body' };
  }

  let result: SmsSaveResult;
  try {
    result = await persistSms(sender, rawSms, receivedAt);
  } catch (err: any) {
    result = { ok: false, error: err?.message || String(err) };
  }

  if (result.ok) {
    const saveTime = new Date().toISOString();
    updateDiagnostics({
      lastSmsSavedAt: saveTime,
      lastSupabaseInsertAt: result.duplicate ? getSmsDiagnostics().lastSupabaseInsertAt : saveTime,
      lastSupabaseInsertId: result.id ?? getSmsDiagnostics().lastSupabaseInsertId,
      totalSaved: getSmsDiagnostics().totalSaved + (result.duplicate ? 0 : 1),
    });
  } else {
    const outbox = readOutbox();
    outbox.push({ sender, rawSms, receivedAt, attempts: 1 });
    writeOutbox(outbox);
    recordError(`Supabase insert failed (queued for retry): ${result.error}`);
    updateDiagnostics({ totalFailed: getSmsDiagnostics().totalFailed + 1 });
  }
  return result;
}

let flushing = false;
export async function flushSmsOutbox(): Promise<{ saved: number; remaining: number }> {
  if (flushing) return { saved: 0, remaining: readOutbox().length };
  flushing = true;
  let saved = 0;
  try {
    const items = readOutbox();
    const remaining: OutboxItem[] = [];
    for (const item of items) {
      const res = await persistSms(item.sender, item.rawSms, item.receivedAt).catch((e) => ({ ok: false, error: String(e) }) as SmsSaveResult);
      if (res.ok) {
        saved++;
        const t = new Date().toISOString();
        updateDiagnostics({
          lastSmsSavedAt: t,
          lastSupabaseInsertAt: res.duplicate ? getSmsDiagnostics().lastSupabaseInsertAt : t,
          lastSupabaseInsertId: res.id ?? getSmsDiagnostics().lastSupabaseInsertId,
          totalSaved: getSmsDiagnostics().totalSaved + (res.duplicate ? 0 : 1),
        });
      } else {
        remaining.push({ ...item, attempts: item.attempts + 1 });
        recordError(`Outbox retry failed: ${res.error}`);
      }
    }
    writeOutbox(remaining);
    updateDiagnostics({});
    return { saved, remaining: remaining.length };
  } finally {
    flushing = false;
  }
}

export function markReceiverRegistered() {
  updateDiagnostics({ receiverRegisteredAt: new Date().toISOString() });
}

export interface SmsTableHealth {
  ok: boolean;
  error: string;
  missingTable: boolean;
}

export async function checkSmsTable(): Promise<SmsTableHealth> {
  if (!supabase) return { ok: false, error: 'Supabase client not configured', missingTable: false };
  const { error } = await supabase.from(SMS_TABLE).select('id', { head: true, count: 'exact' }).limit(1);
  if (error) {
    const missing = error.code === 'PGRST205' || error.code === '42P01' || /could not find the table|does not exist/i.test(error.message);
    return { ok: false, error: `${error.code || 'ERR'}: ${error.message}`, missingTable: missing };
  }
  return { ok: true, error: '', missingTable: false };
}

export async function fetchSmsTransactions(limit = 200): Promise<SmsTransaction[]> {
  if (!supabase) throw new Error('Supabase client not configured');
  const { data, error } = await supabase.from(SMS_TABLE).select('*').order('received_at', { ascending: false }).limit(limit);
  if (error) throw new Error(`${error.code || 'ERR'}: ${error.message}`);
  return (data || []) as SmsTransaction[];
}

export async function fetchLatestSavedSms(): Promise<SmsTransaction | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(SMS_TABLE).select('*').order('created_at', { ascending: false }).limit(1);
  if (error) throw new Error(`${error.code || 'ERR'}: ${error.message}`);
  return (data?.[0] as SmsTransaction) || null;
}

export async function countUnreviewedSms(): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from(SMS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('status', 'UNREVIEWED');
  if (error) {
    console.error('[BIGsta SMS Receiver] Unreviewed count failed:', error.message);
    return 0;
  }
  return count || 0;
}

export async function updateSmsStatus(id: string, status: SmsReviewStatus): Promise<void> {
  if (!supabase) throw new Error('Supabase client not configured');
  const { data, error } = await supabase.from(SMS_TABLE).update({ status }).eq('id', id).select('id').single();
  if (error) throw new Error(`${error.code || 'ERR'}: ${error.message}`);
  if (!data) throw new Error('Update not confirmed');
}

export function subscribeSmsTransactions(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`realtime_${SMS_TABLE}_${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: SMS_TABLE }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Payment auto-confirmation
//
// The APK native receiver and the server webhook both store every incoming
// SMS in `sms_logs`. When a user types their transaction code + amount into
// the recharge form we must look for THAT row here — previously the lookup
// only searched `user_payments`, so any payment ingested by the phone app
// never auto-confirmed and always fell through to manual admin review.
// ---------------------------------------------------------------------------

export type SmsClaimOutcome =
  | 'CLAIMED'
  | 'NOT_FOUND'
  | 'AMOUNT_MISMATCH'
  | 'ALREADY_USED'
  | 'UNPARSED'
  | 'ERROR';

export interface SmsClaimResult {
  outcome: SmsClaimOutcome;
  message: string;
  amount?: number;
  row?: SmsTransaction;
}

export function normalizeReference(reference: string): string {
  return String(reference || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** Read-only lookup of an SMS by its mobile-money reference. */
export async function findSmsByReference(reference: string): Promise<SmsTransaction | null> {
  if (!supabase) return null;
  const ref = normalizeReference(reference);
  if (!ref) return null;
  const { data, error } = await supabase
    .from(SMS_TABLE)
    .select('*')
    .or(`reference.ilike.${ref},transaction_id.ilike.${ref}`)
    .order('received_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(`${error.code || 'ERR'}: ${error.message}`);
  return (data?.[0] as SmsTransaction) || null;
}

/**
 * Atomically claim a stored SMS for a user recharge.
 *
 * The UNREVIEWED -> REVIEWED transition is done with a conditional UPDATE so
 * two people submitting the same code at the same time can never both win.
 */
export async function claimSmsPaymentByReference(
  reference: string,
  amountInput: number,
): Promise<SmsClaimResult> {
  if (!supabase) return { outcome: 'ERROR', message: 'Cloud database is not configured.' };

  const ref = normalizeReference(reference);
  if (!ref) return { outcome: 'NOT_FOUND', message: 'Transaction code is empty or invalid.' };

  let row: SmsTransaction | null;
  try {
    row = await findSmsByReference(ref);
  } catch (e: any) {
    return { outcome: 'ERROR', message: e?.message || String(e) };
  }

  if (!row) {
    return { outcome: 'NOT_FOUND', message: `No payment SMS stored for code ${ref}.` };
  }
  if (row.status !== 'UNREVIEWED') {
    return { outcome: 'ALREADY_USED', message: `Code ${ref} has already been used.`, row };
  }
  if (row.processing_state !== 'PARSED' || row.amount === null || row.amount === undefined) {
    return {
      outcome: 'UNPARSED',
      message: `The SMS for code ${ref} was stored but its amount could not be read automatically.`,
      row,
    };
  }

  const smsAmount = Number(row.amount);
  if (!Number.isFinite(smsAmount) || Math.abs(smsAmount - Number(amountInput)) > 1) {
    return {
      outcome: 'AMOUNT_MISMATCH',
      message: `The amount you entered (TSh ${Number(amountInput).toLocaleString()}) does not match the payment SMS for code ${ref}.`,
      amount: smsAmount,
      row,
    };
  }

  const { data: claimed, error: claimError } = await supabase
    .from(SMS_TABLE)
    .update({ status: 'REVIEWED' as SmsReviewStatus })
    .eq('id', row.id)
    .eq('status', 'UNREVIEWED')
    .select('*')
    .maybeSingle();

  if (claimError) {
    return { outcome: 'ERROR', message: `${claimError.code || 'ERR'}: ${claimError.message}` };
  }
  if (!claimed) {
    return { outcome: 'ALREADY_USED', message: `Code ${ref} was just used by another request.`, row };
  }

  return {
    outcome: 'CLAIMED',
    message: `Payment of TSh ${smsAmount.toLocaleString()} confirmed.`,
    amount: smsAmount,
    row: claimed as SmsTransaction,
  };
}

/** Release a claim when granting tokens afterwards fails, so the user can retry. */
export async function releaseSmsClaim(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from(SMS_TABLE).update({ status: 'UNREVIEWED' as SmsReviewStatus }).eq('id', id);
}

export const SMS_TABLE_SQL = `CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_hash TEXT UNIQUE NOT NULL,
  sender TEXT NOT NULL,
  raw_sms TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_id TEXT NOT NULL,
  network TEXT,
  amount NUMERIC,
  reference TEXT,
  receiver TEXT,
  balance NUMERIC,
  transaction_id TEXT,
  payer_name TEXT,
  payer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'UNREVIEWED',
  processing_state TEXT NOT NULL DEFAULT 'PARSE_FAILED',
  source TEXT NOT NULL DEFAULT 'bigsta_apk',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sms_logs_received_at_idx ON public.sms_logs (received_at DESC);
CREATE INDEX IF NOT EXISTS sms_logs_status_idx ON public.sms_logs (status);
CREATE INDEX IF NOT EXISTS sms_logs_sms_hash_idx ON public.sms_logs (sms_hash);
CREATE INDEX IF NOT EXISTS sms_logs_reference_idx ON public.sms_logs (upper(reference));
CREATE INDEX IF NOT EXISTS sms_logs_transaction_id_idx ON public.sms_logs (upper(transaction_id));
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.sms_logs TO anon, authenticated;
DROP POLICY IF EXISTS "Allow public access sms_logs" ON public.sms_logs;
CREATE POLICY "Allow public access sms_logs" ON public.sms_logs FOR ALL USING (true) WITH CHECK (true);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sms_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_logs;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';`;
