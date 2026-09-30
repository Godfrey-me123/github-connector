import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, UploadCloud } from 'lucide-react';
import {
  SmsDiagnostics,
  SmsTableHealth,
  SmsTransaction,
  checkSmsTable,
  fetchLatestSavedSms,
  flushSmsOutbox,
  getDeviceId,
  getSmsDiagnostics,
  subscribeSmsDiagnostics,
  subscribeSmsTransactions,
} from '../../services/smsReceiver';
import { SmsSetupRequired } from './SmsTransactionsPanel';

const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : 'Never');

function Row({ label, value, tone = 'default' }: { label: string; value: React.ReactNode; tone?: 'default' | 'good' | 'bad' | 'warn' }) {
  const toneClass = {
    default: 'text-gray-900',
    good: 'text-emerald-700',
    bad: 'text-rose-700',
    warn: 'text-amber-700',
  }[tone];
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-3 border-b border-gray-100 last:border-0">
      <dt className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</dt>
      <dd className={`text-xs font-bold break-all sm:text-right ${toneClass}`}>{value}</dd>
    </div>
  );
}

export function SmsDiagnosticsPanel() {
  const [diag, setDiag] = useState<SmsDiagnostics>(getSmsDiagnostics());
  const [health, setHealth] = useState<SmsTableHealth | null>(null);
  const [latest, setLatest] = useState<SmsTransaction | null>(null);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [flushMsg, setFlushMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setDiag(getSmsDiagnostics());
    const h = await checkSmsTable();
    setHealth(h);
    if (h.ok) {
      try {
        setLatest(await fetchLatestSavedSms());
        setLatestError(null);
      } catch (e: any) {
        setLatestError(e.message);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsubDiag = subscribeSmsDiagnostics(() => setDiag(getSmsDiagnostics()));
    const unsubRt = subscribeSmsTransactions(refresh);
    return () => {
      unsubDiag();
      unsubRt();
    };
  }, [refresh]);

  const receiverActive = diag.nativeInterfaceDetected && Boolean(diag.receiverRegisteredAt);

  return (
    <div className="space-y-6">
      {health && !health.ok && health.missingTable && <SmsSetupRequired error={health.error} />}

      <section className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">SMS Diagnostics</h3>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-black uppercase text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Refresh
          </button>
        </div>
        <dl>
          <Row
            label="SMS Receiver Status"
            value={
              receiverActive
                ? 'ACTIVE (BIGsta APK native receiver)'
                : diag.nativeInterfaceDetected
                  ? 'APK detected, receiver not registered'
                  : 'INACTIVE (not running inside BIGsta APK)'
            }
            tone={receiverActive ? 'good' : 'warn'}
          />
          <Row label="This Device ID" value={<span className="font-mono">{getDeviceId()}</span>} />
          <Row
            label="Last SMS Received (this device)"
            value={diag.lastSmsReceivedAt ? `${fmt(diag.lastSmsReceivedAt)} · ${diag.lastSmsSender}` : 'Never'}
          />
          <Row label="Last SMS Saved (this device)" value={fmt(diag.lastSmsSavedAt)} tone={diag.lastSmsSavedAt ? 'good' : 'default'} />
          <Row
            label="Last Supabase Insert (this device)"
            value={diag.lastSupabaseInsertAt ? `${fmt(diag.lastSupabaseInsertAt)} · ${diag.lastSupabaseInsertId}` : 'Never'}
            tone={diag.lastSupabaseInsertAt ? 'good' : 'default'}
          />
          <Row
            label="Latest Row in Supabase (all devices)"
            value={
              !health
                ? 'Checking...'
                : !health.ok
                  ? 'Unavailable'
                  : latestError
                    ? latestError
                    : latest
                      ? `${fmt(latest.created_at)} · ${latest.sender} · ${latest.device_id}`
                      : 'No rows yet'
            }
            tone={latestError ? 'bad' : 'default'}
          />
          <Row
            label="Supabase sms_logs Table"
            value={!health ? 'Checking...' : health.ok ? 'Reachable' : health.error}
            tone={!health ? 'default' : health.ok ? 'good' : 'bad'}
          />
          <Row label="Last Error" value={diag.lastError ? `${fmt(diag.lastErrorAt)} · ${diag.lastError}` : 'None'} tone={diag.lastError ? 'bad' : 'good'} />
          <Row
            label="Device Counters"
            value={`${diag.totalReceived} received · ${diag.totalSaved} saved · ${diag.totalFailed} failed`}
          />
          <Row label="Pending Outbox (not yet in Supabase)" value={diag.pendingOutbox} tone={diag.pendingOutbox > 0 ? 'warn' : 'good'} />
        </dl>
        {diag.pendingOutbox > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                const r = await flushSmsOutbox();
                setFlushMsg(`${r.saved} saved, ${r.remaining} still pending`);
                refresh();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase"
            >
              <UploadCloud className="w-3.5 h-3.5" aria-hidden="true" /> Retry outbox now
            </button>
            {flushMsg && <span className="text-xs text-gray-600">{flushMsg}</span>}
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-2">
        <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">APK native contract</h4>
        <p className="text-xs text-gray-600 leading-relaxed">
          The APK&apos;s Android SMS BroadcastReceiver (RECEIVE_SMS permission) must call into the WebView with:
        </p>
        <pre className="bg-gray-950 text-gray-100 text-[11px] rounded-2xl p-3 overflow-x-auto">
          {'webView.evaluateJavascript("window.onNativeSmsReceived(" + JSONObject.quote(sender) + "," + JSONObject.quote(body) + "," + timestampMillis + ")", null);'}
        </pre>
        <p className="text-xs text-gray-600 leading-relaxed">
          Optional: expose <code className="font-mono">getDeviceId()</code> on the JS interface for a stable hardware device ID. Status above only reports ACTIVE when the page is running inside the APK.
        </p>
      </section>
    </div>
  );
}
