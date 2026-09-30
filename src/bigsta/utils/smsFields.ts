// Shared, environment-agnostic SMS field extraction.
// Used by BOTH the in-app native SMS receiver (browser/APK) and the
// server webhook (`/api/payment-sms`) so every ingestion path stores
// exactly the same columns in `sms_logs`.

import { parseSms } from './smsParser';

export interface ExtractedPayment {
  amount: number | null;
  reference: string | null;
  transactionId: string | null;
  payerName: string | null;
  payerPhone: string | null;
  receiver: string | null;
  balance: number | null;
  network: string | null;
}

export function detectNetwork(sender: string, text: string): string | null {
  const hay = `${sender} ${text}`.toLowerCase();
  if (hay.includes('m-pesa') || hay.includes('mpesa') || hay.includes('vodacom')) return 'M-Pesa';
  if (hay.includes('mixx') || hay.includes('yas')) return 'Mixx by Yas';
  if (hay.includes('tigo')) return 'Tigo Pesa';
  if (hay.includes('airtel')) return 'Airtel Money';
  if (hay.includes('halo')) return 'HaloPesa';
  if (hay.includes('t-pesa') || hay.includes('ttcl')) return 'T-Pesa';
  if (hay.includes('crdb') || hay.includes('nmb') || hay.includes('bank')) return 'Bank';
  return null;
}

const toNumber = (v?: string | null) => {
  if (!v) return null;
  const n = parseFloat(v.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

export function extractPaymentFields(sender: string, rawSms: string): ExtractedPayment {
  const text = String(rawSms || '').trim();
  const structured = parseSms(text);

  const amountMatch = text.match(/(?:TSh|Tsh|TZS)\s*([\d,]+(?:\.\d{1,2})?)/i);
  const refMatch =
    text.match(/(?:Ref(?:erence)?|Kumbukumbu|Muamala|Transaction\s*ID|TxnID|ID)\s*(?:No\.?|namba)?\s*[:.]?\s*([A-Z0-9]{6,20})/i) ||
    text.match(/^([A-Z0-9]{8,12})\b/);
  const phoneMatch = text.match(/\b(255\d{9}|0[67]\d{8})\b/);
  const balanceMatch = text.match(/(?:balance|salio)[^\d]{0,40}([\d,]+(?:\.\d{1,2})?)/i);
  const fromMatch = text.match(/(?:from|kutoka\s+kwa|kutoka)\s+([A-Z][A-Z .'-]{2,40}?)(?=\s*(?:\(|\d|on\b|mnamo|\.|,|$))/i);
  const toMatch = text.match(/(?:sent\s+to|to|kwenda\s+kwa|kwa)\s+([A-Z][A-Z .'-]{2,40}?)(?=\s*(?:\(|\d|on\b|mnamo|\.|,|$))/i);

  const reference = structured?.transactionReference || refMatch?.[1] || null;
  return {
    amount: structured?.amount ?? toNumber(amountMatch?.[1]),
    reference,
    transactionId: reference,
    payerName:
      structured?.senderName && structured.senderName !== 'Mobile Payment Transfer'
        ? structured.senderName
        : fromMatch?.[1]?.trim() || null,
    payerPhone: structured?.senderPhone || phoneMatch?.[1] || null,
    receiver: toMatch?.[1]?.trim() || null,
    balance: structured?.newBalance || toNumber(balanceMatch?.[1]),
    network:
      detectNetwork(sender, text) ||
      (structured?.network && structured.network !== 'Mobile Money Gateway' ? structured.network : null),
  };
}

// A payment is only considered "parsed" when both an amount and a reference
// were recovered. Anything else is stored raw with PARSE_FAILED — never dropped.
export function isParsedPayment(fields: ExtractedPayment): boolean {
  return fields.amount !== null && fields.reference !== null;
}

// Stable dedup key. Truncated to the minute so that a redelivery of the same
// SMS (device retry, webhook retry, outbox flush) collides on the sms_hash
// UNIQUE constraint, while two genuinely separate payments with identical text
// minutes apart still both get stored.
export function smsHashInput(sender: string, rawSms: string, receivedAt: string): string {
  const minute = receivedAt.length >= 16 ? receivedAt.slice(0, 16) : receivedAt;
  return `${sender}|${String(rawSms).trim()}|${minute}`;
}

export async function computeSmsHash(sender: string, rawSms: string, receivedAt: string): Promise<string> {
  const input = smsHashInput(sender, rawSms, receivedAt);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
