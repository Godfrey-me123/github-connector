import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Copy, RefreshCw, Send, XCircle } from 'lucide-react';

type Check = { name: string; ok: boolean; detail: string };
type Status = {
  ok: boolean;
  checks: Check[];
  lastReceived: string | null;
  lastSaved: string | null;
  lastError: { at: string; detail: string } | null;
  failedAttempts: number;
  config: { webhookUrl: string; secret: string; headers: Record<string, string>; bodyTemplate: Record<string, string> };
};

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : 'Never');

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="flex items-start gap-2">
        <code className="flex-1 text-xs font-mono break-all bg-gray-50 rounded-xl p-2">{value}</code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-black uppercase"
        >
          <Copy className="w-3.5 h-3.5" /> {done ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export function SmsGatewayPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/sms-gateway');
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setStatus(j);
    } catch (e: any) {
      setError(e.message || 'Could not load gateway status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendTest = async () => {
    if (!status) return;
    setTestMsg('Sending test SMS…');
    try {
      const r = await fetch('/api/public/payment-sms', {
        method: 'POST',
        headers: status.config.headers,
        body: JSON.stringify({
          sender: 'BIGSTA-TEST',
          message: `TEST${Date.now().toString().slice(-6)} Confirmed. Gateway test message from admin panel.`,
          device_name: 'Admin Test',
        }),
      });
      const j = await r.json();
      setTestMsg(
        j.stored || j.success
          ? `Test SMS received and saved (status ${j.status}). It appears in SMS Transactions.`
          : `Test failed: ${j.error || j.status}`,
      );
      load();
    } catch (e: any) {
      setTestMsg(`Test failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">SMS Gateway Status</h3>
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-black uppercase">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Test SMS Gateway
          </button>
        </div>
        {error && <p className="text-xs font-bold text-rose-700">{error}</p>}
        {!status && !error && <p className="text-xs text-gray-500">Checking…</p>}
        {status && (
          <>
            <div className={`mb-3 text-xs font-black uppercase ${status.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
              Gateway {status.ok ? 'ONLINE' : 'HAS PROBLEMS'}
            </div>
            <ul className="space-y-2 mb-4">
              {status.checks.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 font-bold">
                    {c.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                    {c.name}
                  </span>
                  <span className="text-gray-500 text-right">{c.detail}</span>
                </li>
              ))}
            </ul>
            <dl className="text-xs space-y-1">
              <div><b>Last SMS received:</b> {fmt(status.lastReceived)}</div>
              <div><b>Last SMS saved:</b> {fmt(status.lastSaved)}</div>
              <div><b>Rejected attempts:</b> {status.failedAttempts}</div>
              <div className={status.lastError ? 'text-rose-700' : ''}>
                <b>Last error:</b> {status.lastError ? `${fmt(status.lastError.at)} · ${status.lastError.detail}` : 'None'}
              </div>
            </dl>
          </>
        )}
      </section>

      {status && (
        <section className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">SMS Forwarder Setup</h3>
          <p className="text-xs text-gray-600 mb-2">Paste these into your SMS Forwarder app (method POST, JSON body).</p>
          <CopyRow label="Webhook URL" value={status.config.webhookUrl} />
          <CopyRow label="Secret Key" value={status.config.secret} />
          <CopyRow label="Header" value={`X-BIGSTA-SECRET: ${status.config.secret}`} />
          <CopyRow label="JSON Body" value={JSON.stringify(status.config.bodyTemplate)} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={sendTest} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase">
              <Send className="w-3.5 h-3.5" /> Send test SMS
            </button>
            {testMsg && <span className="text-xs text-gray-700">{testMsg}</span>}
          </div>
        </section>
      )}
    </div>
  );
}
