import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Copy, EyeOff, RefreshCw } from 'lucide-react';
import {
  SMS_TABLE_SQL,
  SmsReviewStatus,
  SmsTransaction,
  checkSmsTable,
  fetchSmsTransactions,
  subscribeSmsTransactions,
  updateSmsStatus,
} from '../../services/smsReceiver';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'setup'; error: string }
  | { kind: 'error'; error: string }
  | { kind: 'ready' };

const statusStyles: Record<SmsReviewStatus, string> = {
  UNREVIEWED: 'bg-amber-50 text-amber-800 border-amber-200',
  REVIEWED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  IGNORED: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function SmsSetupRequired({ error }: { error: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-white border border-amber-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <h3 className="text-sm font-black text-gray-900">SMS storage table not found in Supabase</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Incoming SMS cannot be verified as saved until the <code className="font-mono">sms_logs</code> table exists.
            SMS received by the APK meanwhile are kept in the device outbox and retried automatically. Run the SQL below once in the Supabase SQL editor.
          </p>
          <p className="text-[11px] font-mono text-rose-700 break-all">{error}</p>
        </div>
      </div>
      <div className="relative">
        <pre className="bg-gray-950 text-gray-100 text-[11px] leading-relaxed rounded-2xl p-4 overflow-x-auto max-h-72">{SMS_TABLE_SQL}</pre>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(SMS_TABLE_SQL).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-[10px] font-black uppercase hover:bg-white/20"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy SQL'}
        </button>
      </div>
    </div>
  );
}

export function SmsTransactionsPanel() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [rows, setRows] = useState<SmsTransaction[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const health = await checkSmsTable();
    if (!health.ok) {
      setState(health.missingTable ? { kind: 'setup', error: health.error } : { kind: 'error', error: health.error });
      return;
    }
    try {
      setRows(await fetchSmsTransactions());
      setState({ kind: 'ready' });
    } catch (e: any) {
      setState({ kind: 'error', error: e.message });
    }
  }, []);

  useEffect(() => {
    load();
    return subscribeSmsTransactions(load);
  }, [load]);

  const setStatus = async (id: string, status: SmsReviewStatus) => {
    setBusyId(id);
    setActionError(null);
    try {
      await updateSmsStatus(id, status);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (state.kind === 'loading') {
    return <div className="bg-white border border-gray-200 rounded-3xl p-6 text-xs text-gray-500">Verifying Supabase SMS storage...</div>;
  }
  if (state.kind === 'setup') return <SmsSetupRequired error={state.error} />;
  if (state.kind === 'error') {
    return (
      <div className="bg-white border border-rose-200 rounded-3xl p-6 space-y-3">
        <p className="text-sm font-black text-rose-700">Could not load SMS transactions</p>
        <p className="text-xs font-mono text-rose-700 break-all">{state.error}</p>
        <button type="button" onClick={load} className="text-xs font-black text-blue-600">Retry</button>
      </div>
    );
  }

  const unreviewed = rows.filter((r) => r.status === 'UNREVIEWED').length;

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm">
      <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">SMS Transactions</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {rows.length} stored &middot; {unreviewed} unreviewed &middot; newest first
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-black uppercase text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Refresh
        </button>
      </div>

      {actionError && <p className="px-5 pt-3 text-xs font-mono text-rose-700">{actionError}</p>}

      {rows.length === 0 ? (
        <p className="p-8 text-center text-xs text-gray-500">
          No SMS have been received by a BIGsta APK yet. Received payment SMS appear here as soon as they are confirmed in Supabase.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((r) => {
            const open = expanded === r.id;
            return (
              <li key={r.id} className="p-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-gray-900 font-mono">
                        {r.amount !== null ? `TSh ${Number(r.amount).toLocaleString()}` : 'Amount n/a'}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${statusStyles[r.status] || statusStyles.UNREVIEWED}`}>
                        {r.status}
                      </span>
                      {r.processing_state === 'PARSE_FAILED' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md border bg-rose-50 text-rose-700 border-rose-200">RAW ONLY</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      {new Date(r.received_at).toLocaleString()} &middot; {r.sender}
                      {r.network ? ` · ${r.network}` : ''}
                    </p>
                    <p className="text-[11px] text-gray-700">
                      Ref: <span className="font-mono font-bold">{r.reference || '-'}</span>
                      {r.payer_name ? ` · From ${r.payer_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.status !== 'REVIEWED' && (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => setStatus(r.id, 'REVIEWED')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" /> Reviewed
                      </button>
                    )}
                    {r.status === 'UNREVIEWED' && (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => setStatus(r.id, 'IGNORED')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[10px] font-black uppercase disabled:opacity-50"
                      >
                        <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> Ignore
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : r.id)}
                      aria-expanded={open}
                      aria-label={open ? 'Hide raw SMS' : 'Show raw SMS'}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                    >
                      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className={`mt-2 text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 font-mono break-words ${open ? 'whitespace-pre-wrap' : 'truncate'}`}>
                  {r.raw_sms}
                </p>
                {open && (
                  <dl className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    {[
                      ['Transaction ID', r.transaction_id],
                      ['Receiver', r.receiver],
                      ['Balance', r.balance !== null ? `TSh ${Number(r.balance).toLocaleString()}` : null],
                      ['Payer phone', r.payer_phone],
                      ['Device', r.device_id],
                      ['Processing', r.processing_state],
                    ].map(([label, value]) => (
                      <div key={label as string} className="min-w-0">
                        <dt className="text-gray-400 font-bold uppercase text-[9px]">{label}</dt>
                        <dd className="font-mono text-gray-800 truncate">{value || '-'}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
