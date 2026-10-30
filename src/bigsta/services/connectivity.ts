// Real backend connectivity detection.
//
// `navigator.onLine` only says the device has *a* network; it does not prove
// that our server or the database are reachable (captive portals, dead mobile
// data, Supabase outages, Android WebViews that never fire `online`).
// Backend-dependent actions (payments, submissions, admin messages, uploads)
// must call `ensureBackend()` before sending anything.

export type ConnectivityState = "online" | "offline" | "backend-down" | "unknown";

export interface ConnectivitySnapshot {
  state: ConnectivityState;
  checkedAt: number;
  detail?: string;
}

type Listener = (snap: ConnectivitySnapshot) => void;

const HEALTH_URL = "/api/health?deep=1";
const PROBE_TIMEOUT_MS = 6000;
const CACHE_MS = 15000;

let current: ConnectivitySnapshot = { state: "unknown", checkedAt: 0 };
let inflight: Promise<ConnectivitySnapshot> | null = null;
const listeners = new Set<Listener>();

function emit(next: ConnectivitySnapshot) {
  const changed = next.state !== current.state;
  current = next;
  if (changed) listeners.forEach((l) => l(next));
}

/** Interpret a health probe result. Exported for tests. */
export function classifyProbe(input: {
  deviceOnline: boolean;
  status?: number;
  body?: { status?: string; database?: string } | null;
  error?: unknown;
}): ConnectivityState {
  if (!input.deviceOnline) return "offline";
  if (input.error !== undefined || input.status === undefined) return "offline";
  if (input.status >= 500 || input.status === 0) return "backend-down";
  if (input.status !== 200) return "backend-down";
  if (input.body?.database && input.body.database !== "ok") return "backend-down";
  return "online";
}

export async function checkBackend(force = false): Promise<ConnectivitySnapshot> {
  if (typeof window === "undefined") return current;
  if (!force && current.state !== "unknown" && Date.now() - current.checkedAt < CACHE_MS) {
    return current;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const deviceOnline = navigator.onLine !== false;
    if (!deviceOnline) {
      const snap = { state: "offline" as const, checkedAt: Date.now() };
      emit(snap);
      return snap;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    try {
      const res = await fetch(HEALTH_URL, { cache: "no-store", signal: ctrl.signal });
      let body: { status?: string; database?: string } | null = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      const state = classifyProbe({ deviceOnline, status: res.status, body });
      const snap = { state, checkedAt: Date.now(), detail: body?.database };
      emit(snap);
      return snap;
    } catch (error) {
      const snap = {
        state: classifyProbe({ deviceOnline, error }),
        checkedAt: Date.now(),
      };
      emit(snap);
      return snap;
    } finally {
      clearTimeout(timer);
      inflight = null;
    }
  })();
  return inflight;
}

export function getConnectivity(): ConnectivitySnapshot {
  return current;
}

export function subscribeConnectivity(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export class BackendUnavailableError extends Error {
  state: ConnectivityState;
  constructor(state: ConnectivityState) {
    super(
      state === "offline"
        ? "You are offline. This action needs an internet connection — your input has been kept."
        : "BIGsta's server can't be reached right now. Please try again shortly — your input has been kept.",
    );
    this.name = "BackendUnavailableError";
    this.state = state;
  }
}

/** Throw unless the backend (server + database) is genuinely reachable. */
export async function ensureBackend(): Promise<void> {
  const snap = await checkBackend(true);
  if (snap.state !== "online") throw new BackendUnavailableError(snap.state);
}

let monitoring = false;
/** Start background monitoring: re-probe on network events, focus and every 30s. */
export function startConnectivityMonitor(): () => void {
  if (typeof window === "undefined" || monitoring) return () => {};
  monitoring = true;
  const recheck = () => void checkBackend(true);
  window.addEventListener("online", recheck);
  window.addEventListener("offline", recheck);
  window.addEventListener("focus", recheck);
  const timer = setInterval(recheck, 30000);
  recheck();
  return () => {
    monitoring = false;
    window.removeEventListener("online", recheck);
    window.removeEventListener("offline", recheck);
    window.removeEventListener("focus", recheck);
    clearInterval(timer);
  };
}
