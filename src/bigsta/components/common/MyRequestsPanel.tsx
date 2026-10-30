import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Inbox } from "lucide-react";
import { supabase } from "../../services/supabase";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";

export interface MyRequestRow {
  id: string;
  kind: "NIDA request" | "Manual application" | "Feedback";
  title: string;
  status: string;
  createdAt: string;
  reply?: string | null;
}

/** Merge rows from every request table into one newest-first list. Exported for tests. */
export function mergeMyRequests(input: {
  nida?: any[];
  manual?: any[];
  feedback?: any[];
}): MyRequestRow[] {
  const rows: MyRequestRow[] = [
    ...(input.nida || []).map((r) => ({
      id: `nida_${r.id}`,
      kind: "NIDA request" as const,
      title: r.requester_name || r.nida_no || r.request_type || "NIDA request",
      status: r.status || "PENDING",
      createdAt: r.created_at,
      reply: r.admin_message,
    })),
    ...(input.manual || []).map((r) => ({
      id: `man_${r.id}`,
      kind: "Manual application" as const,
      title: r.service_name || "Manual application",
      status: r.status || "PENDING",
      createdAt: r.submitted_at,
      reply: r.admin_notes,
    })),
    ...(input.feedback || []).map((r) => ({
      id: `fb_${r.id}`,
      kind: "Feedback" as const,
      title: r.subject || r.comment || r.message || "Feedback",
      status: r.status || "PENDING",
      createdAt: r.created_at,
      reply: r.admin_reply,
    })),
  ];
  return rows.sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
}

/** Every request the signed-in user has sent, with status and admin replies. */
export function MyRequestsPanel({ authKey }: { authKey?: string | null }) {
  const [rows, setRows] = useState<MyRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authKey || !supabase) return;
    setLoading(true);
    try {
      const [nida, manual, feedback] = await Promise.all([
        supabase
          .from("nida_requests")
          .select("*")
          .eq("requester_key", authKey)
          .order("created_at", { ascending: false }),
        supabase
          .from("manual_requests")
          .select("*")
          .eq("user_passkey", authKey)
          .order("submitted_at", { ascending: false }),
        supabase
          .from("user_feedback")
          .select("*")
          .eq("user_id", authKey)
          .order("created_at", { ascending: false }),
      ]);
      const firstErr = nida.error || manual.error || feedback.error;
      setError(firstErr ? "Some requests couldn't load. Pull to retry." : null);
      setRows(
        mergeMyRequests({ nida: nida.data || [], manual: manual.data || [], feedback: feedback.data || [] }),
      );
    } catch {
      setError("You're offline — requests will appear when you reconnect.");
    } finally {
      setLoading(false);
    }
  }, [authKey]);

  useEffect(() => {
    void load();
  }, [load]);
  useAutoRefresh(load);

  if (!authKey) return null;

  return (
    <div className="mt-6 space-y-3 border-t border-slate-100 pt-4 dark:border-white/10">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">My requests</h3>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      {error && <p className="text-xs text-amber-600">{error}</p>}
      {!loading && rows.length === 0 && !error && (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Inbox className="h-4 w-4" /> You haven't sent any requests yet.
        </p>
      )}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{r.title}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold dark:bg-white/10">
                {r.status}
              </span>
            </div>
            <div className="mt-1 text-slate-500">
              {r.kind} · {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
            </div>
            {r.reply && (
              <div className="mt-2 rounded-lg bg-blue-50 p-2 text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">
                <span className="font-bold">Admin: </span>
                {r.reply}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
