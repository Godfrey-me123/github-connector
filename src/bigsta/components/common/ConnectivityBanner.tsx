import { useEffect, useState } from "react";
import { WifiOff, ServerCrash, X, RefreshCw } from "lucide-react";
import {
  checkBackend,
  getConnectivity,
  startConnectivityMonitor,
  subscribeConnectivity,
  type ConnectivityState,
} from "../../services/connectivity";

/**
 * Small floating notice shown only when offline or the server is unreachable.
 * It never covers buttons: the wrapper ignores clicks, only the pill itself is
 * clickable. The user controls it: collapse it to a tiny dot, tap the dot to
 * reopen, or close it for the rest of this session.
 */
export function ConnectivityBanner() {
  const [state, setState] = useState<ConnectivityState>("unknown");
  const [mode, setMode] = useState<"open" | "mini" | "closed">("open");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("bigsta_conn_banner_closed") === "1") setMode("closed");
    } catch {}
    setState(getConnectivity().state);
    const unsub = subscribeConnectivity((s) => setState(s.state));
    const stop = startConnectivityMonitor();
    return () => {
      unsub();
      stop();
    };
  }, []);

  if (mode === "closed" || (state !== "offline" && state !== "backend-down")) return null;

  const offline = state === "offline";
  const Icon = offline ? WifiOff : ServerCrash;

  const retry = async () => {
    setChecking(true);
    try {
      await checkBackend(true);
    } finally {
      setChecking(false);
    }
  };
  const close = () => {
    setMode("closed");
    try {
      sessionStorage.setItem("bigsta_conn_banner_closed", "1");
    } catch {}
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-2 z-[9999]"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
    >
      {mode === "mini" ? (
        <button
          type="button"
          onClick={() => setMode("open")}
          title={offline ? "You're offline — tap for details" : "Server unreachable — tap for details"}
          aria-label="Show connection notice"
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg ring-2 ring-white/70"
        >
          <Icon size={14} />
        </button>
      ) : (
        <div className="pointer-events-auto flex max-w-[calc(100vw-1rem)] items-center gap-2 rounded-full bg-amber-500 py-1 pl-3 pr-1 text-xs font-semibold text-black shadow-lg sm:max-w-md">
          <Icon size={14} className="shrink-0" />
          <span className="truncate">
            {offline ? "Offline — local tools still work" : "Server unreachable — local tools still work"}
          </span>
          <button
            type="button"
            onClick={() => void retry()}
            aria-label="Check connection again"
            className="shrink-0 rounded-full p-1.5 hover:bg-black/15"
          >
            <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => setMode("mini")}
            aria-label="Minimise notice"
            className="shrink-0 rounded-full px-1.5 py-0.5 text-[11px] hover:bg-black/15"
          >
            Hide
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Close notice for this session"
            className="shrink-0 rounded-full p-1.5 hover:bg-black/15"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
