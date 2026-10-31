import { useEffect, useState, useRef } from "react";
import { WifiOff, ServerCrash, X, RefreshCw, CheckCircle2 } from "lucide-react";
import {
  checkBackend,
  getConnectivity,
  startConnectivityMonitor,
  subscribeConnectivity,
  type ConnectivityState,
} from "../../services/connectivity";

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function ConnectivityBanner() {
  const [state, setState] = useState<ConnectivityState>("unknown");
  const [mode, setMode] = useState<"open" | "mini" | "closed" | "recovered">(() => {
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem("bigsta_conn_banner_closed") === "1") {
        return "closed";
      }
    } catch {}
    return "open";
  });
  const [checking, setChecking] = useState(false);
  const [failedPings, setFailedPings] = useState(0);
  const [lastSynced, setLastSynced] = useState<string>(() => formatTime(new Date()));
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("bigsta_conn_banner_closed") === "1") {
        setMode("closed");
      }
    } catch {}

    const unsub = subscribeConnectivity((s) => {
      if (s.state === "online") {
        setLastSynced(formatTime(new Date()));
        try {
          sessionStorage.removeItem("bigsta_conn_banner_closed");
        } catch {}
        setState((prevState) => {
          if (prevState !== "online" && prevState !== "unknown") {
            setMode("recovered");
            setTimeout(() => setMode("closed"), 3000);
          }
          return s.state;
        });
        setFailedPings(0);
      } else {
        setFailedPings((prev) => prev + 1);
        setState(s.state);
        let isSessionClosed = false;
        try {
          isSessionClosed = sessionStorage.getItem("bigsta_conn_banner_closed") === "1";
        } catch {}
        if (!isSessionClosed) {
          setMode((prev) => (prev === "closed" ? "open" : prev));
        }
      }
    });

    const stop = startConnectivityMonitor();
    return () => {
      unsub();
      stop();
    };
  }, []);

  // Auto-collapse after 8 seconds in open mode
  useEffect(() => {
    if (mode === "open") {
      collapseTimerRef.current = setTimeout(() => {
        setMode("mini");
      }, 8000);
    }
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, [mode]);

  // Genuine offline condition or failed probe threshold (supports dead Wi-Fi and backend down)
  const genuinelyOffline = typeof navigator !== "undefined" && navigator.onLine === false;
  const isProbeFailing = (state === "offline" || state === "backend-down") && failedPings >= 2;
  const shouldShow =
    mode !== "closed" &&
    (mode === "recovered" || genuinelyOffline || isProbeFailing);

  if (!shouldShow) return null;

  const offline = state === "offline" || genuinelyOffline;
  const isRecovered = mode === "recovered";
  const Icon = isRecovered ? CheckCircle2 : offline ? WifiOff : ServerCrash;

  const handleRetry = async () => {
    setChecking(true);
    try {
      await checkBackend(true);
    } finally {
      setChecking(false);
    }
  };

  const handleClose = () => {
    setMode("closed");
    try {
      sessionStorage.setItem("bigsta_conn_banner_closed", "1");
    } catch {}
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-3 z-[9999] transition-all duration-300"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
    >
      {mode === "mini" ? (
        <button
          type="button"
          onClick={() => setMode("open")}
          title={offline ? `Offline • Last synced at ${lastSynced}` : `Server Unreachable • Last synced at ${lastSynced}`}
          aria-label="Expand connection status"
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg ring-2 ring-white/80 animate-pulse hover:scale-105 transition-transform"
        >
          <Icon size={14} />
        </button>
      ) : (
        <div
          className={`pointer-events-auto flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full py-1.5 pl-3.5 pr-1.5 text-xs font-semibold shadow-xl transition-all duration-300 ${
            isRecovered ? "bg-emerald-600 text-white" : "bg-amber-500 text-black"
          }`}
        >
          <Icon size={14} className="shrink-0" />
          <span className="truncate">
            {isRecovered
              ? "Connected"
              : `${offline ? "Offline" : "Server Unreachable"} • Last synced at ${lastSynced}`}
          </span>

          {!isRecovered && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={checking}
              aria-label="Retry connection check"
              className="shrink-0 rounded-full p-1 hover:bg-black/15 transition-colors"
            >
              <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close notification"
            className="shrink-0 rounded-full p-1 hover:bg-black/15 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
