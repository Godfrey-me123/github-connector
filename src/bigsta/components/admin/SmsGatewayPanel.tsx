import React, { useCallback, useEffect, useState } from "react";
import { adminApiFetch } from "../../services/adminApi";
import { CheckCircle2, Copy, RefreshCw, Send, XCircle, Terminal, Smartphone, ShieldCheck, Sparkles } from "lucide-react";

type Check = { name: string; ok: boolean; detail: string };
type Status = {
  ok: boolean;
  checks: Check[];
  lastReceived: string | null;
  lastSaved: string | null;
  lastError: { at: string; detail: string } | null;
  failedAttempts: number;
  config: {
    webhookUrl: string;
    secret: string;
    headers: Record<string, string>;
    bodyTemplate: Record<string, string>;
  };
};

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "Never");

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className="flex items-start gap-2">
        <code className="flex-1 text-xs font-mono break-all bg-gray-50 rounded-xl p-2">
          {value}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-black uppercase"
        >
          <Copy className="w-3.5 h-3.5" /> {done ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function SmsGatewayPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [simSender, setSimSender] = useState("MPESA");
  const [simDevice, setSimDevice] = useState("Android SMS Forwarder");
  const [simMessage, setSimMessage] = useState("AB12345 Confirmed. Tsh10,000 received from 255712345678 JUMA RASHID. New balance is Tsh10,000.");
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminApiFetch("/api/admin/sms-gateway");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setStatus(j);
    } catch (e: any) {
      setError(e.message || "Could not load gateway status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canonicalUrl = `${origin}/api/public/payment-sms`;
  const secretKey = status?.config?.secret || "••••••••••••••••";
  const curlExample = `curl -X POST ${canonicalUrl} \\
  -H "Content-Type: application/json" \\
  -H "X-BIGSTA-SECRET: ${secretKey}" \\
  -d '{"sender":"MPESA","message":"TEST12345 Confirmed. Tsh10,000 received.","device_name":"Test Device"}'`;

  const sendTest = async () => {
    if (!status) return;
    setSimulating(true);
    setSimResult(null);
    try {
      const r = await fetch("/api/public/payment-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BIGSTA-SECRET": status.config.secret },
        body: JSON.stringify({ sender: simSender.trim(), message: simMessage.trim(), device_name: simDevice.trim() }),
      });
      const j = await r.json();
      setSimResult({ ok: r.ok, status: r.status, data: j });
      load();
    } catch (e: any) {
      setSimResult({ ok: false, status: 0, data: { error: e.message } });
    } finally {
      setSimulating(false);
    }
  };

  const applyPreset = (type: "mpesa" | "tigo" | "airtel") => {
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    if (type === "mpesa") {
      setSimSender("MPESA");
      setSimMessage(`${code} Confirmed. Tsh10,000 received from 255712345678 JUMA RASHID. Balance: Tsh10,000.`);
    } else if (type === "tigo") {
      setSimSender("TigoPesa");
      setSimMessage(`${code} Umepokea Tsh 5,000 kutoka kwa ASHA HAMISI. Salio jipya ni Tsh 5,000.`);
    } else {
      setSimSender("AirtelMoney");
      setSimMessage(`Kumbukumbu No ${code}: Umepokea Tsh 20,000 kutoka kwa JOHN PETER. Salio lako ni Tsh 20,000.`);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
            SMS Gateway Status
          </h3>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-black uppercase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Test SMS
            Gateway
          </button>
        </div>
        {error && <p className="text-xs font-bold text-rose-700">{error}</p>}
        {!status && !error && <p className="text-xs text-gray-500">Checking…</p>}
        {status && (
          <>
            <div
              className={`mb-3 text-xs font-black uppercase ${status.ok ? "text-emerald-700" : "text-rose-700"}`}
            >
              Gateway {status.ok ? "ONLINE" : "HAS PROBLEMS"}
            </div>
            <ul className="space-y-2 mb-4">
              {status.checks.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 font-bold">
                    {c.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    {c.name}
                  </span>
                  <span className="text-gray-500 text-right">{c.detail}</span>
                </li>
              ))}
            </ul>
            <dl className="text-xs space-y-1">
              <div>
                <b>Last SMS received:</b> {fmt(status.lastReceived)}
              </div>
              <div>
                <b>Last SMS saved:</b> {fmt(status.lastSaved)}
              </div>
              <div>
                <b>Rejected attempts:</b> {status.failedAttempts}
              </div>
              <div className={status.lastError ? "text-rose-700" : ""}>
                <b>Last error:</b>{" "}
                {status.lastError
                  ? `${fmt(status.lastError.at)} · ${status.lastError.detail}`
                  : "None"}
              </div>
            </dl>
          </>
        )}
      </section>

      {status && (
        <section className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">
            SMS Forwarder Setup
          </h3>
          <p className="text-xs text-gray-600 mb-2">
            Use only this canonical POST endpoint for all SMS-forwarder integrations.
          </p>
          <CopyRow label="Webhook URL (POST)" value={canonicalUrl} />
          <CopyRow label="Secret Key" value={status.config.secret} />
          <CopyRow label="Required Header" value={`X-BIGSTA-SECRET: ${status.config.secret}`} />
          <CopyRow label="JSON Body" value={JSON.stringify(status.config.bodyTemplate)} />
          <div className="mt-4 rounded-2xl bg-slate-900 p-3 text-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5" /> cURL example</span>
              <button type="button" onClick={() => navigator.clipboard.writeText(curlExample)} className="text-[10px] font-bold text-blue-300">Copy example</button>
            </div>
            <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">{curlExample}</pre>
          </div>
        </section>
      )}

      {status && (
        <section className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-600" /><h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Live SMS Transaction Tester</h3></div>
          <p className="text-xs text-gray-600">Send a test message through the same canonical webhook handler used by your SMS forwarder.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => applyPreset("mpesa")} className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">M-Pesa sample</button>
            <button type="button" onClick={() => applyPreset("tigo")} className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-800 border border-blue-200">Tigo Pesa sample</button>
            <button type="button" onClick={() => applyPreset("airtel")} className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-50 text-red-800 border border-red-200">Airtel Money sample</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Sender
              <input value={simSender} onChange={e => setSimSender(e.target.value)} className="mt-1 w-full text-xs font-mono px-3 py-2 border border-gray-200 rounded-xl" />
            </label>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Device name
              <input value={simDevice} onChange={e => setSimDevice(e.target.value)} className="mt-1 w-full text-xs font-mono px-3 py-2 border border-gray-200 rounded-xl" />
            </label>
          </div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase">Raw SMS message
            <textarea rows={3} value={simMessage} onChange={e => setSimMessage(e.target.value)} className="mt-1 w-full text-xs font-mono px-3 py-2 border border-gray-200 rounded-xl" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={simulating} onClick={sendTest} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-black uppercase">
              <Send className="w-3.5 h-3.5" /> {simulating ? "Sending…" : "Post test SMS"}
            </button>
            {simResult && <span className={`text-xs font-bold ${simResult.ok ? "text-emerald-700" : "text-rose-700"}`}>HTTP {simResult.status}: {JSON.stringify(simResult.data)}</span>}
          </div>
        </section>
      )}
    </div>
  );
}
