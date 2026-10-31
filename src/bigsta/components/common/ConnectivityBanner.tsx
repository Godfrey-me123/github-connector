import { useEffect, useState } from "react";
import { WifiOff, ServerCrash, X } from "lucide-react";
import {
  checkBackend,
  getConnectivity,
  startConnectivityMonitor,
  subscribeConnectivity,
  type ConnectivityState,
} from "../../services/connectivity";

/**
 * Thin top banner shown only when the device is offline or the BIGsta server /
 * database is unreachable. Local tools (PDF, DOCX→PDF, Passport Studio, cached
 * templates) keep working; backend actions are blocked with a clear message.
 * Includes a dismiss button so it never permanently hinders top action buttons.
 */
export function ConnectivityBanner() {
  const [state, setState] = useState<ConnectivityState>("unknown");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const current = getConnectivity().state;
    setState(current);
    const unsub = subscribeConnectivity((s) => {
      setState(s.state);
      setDismissed(false); // Reset dismissal on state change
    });
    const stop = startConnectivityMonitor();
    return () => {
      unsub();
      stop();
    };
  }, []);

  if (dismissed || (state !== "offline" && state !== "backend-down")) return null;

  const offline = state === "offline";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-between gap-2 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black shadow-md"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {offline ? <WifiOff size={14} className="shrink-0" /> : <ServerCrash size={14} className="shrink-0" />}
        <span className="truncate">
          {offline
            ? "Offline — Local tools & saved templates still work. Payments & requests need internet."
            : "Server unreachable — Local tools work. Payments & requests will wait."}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => void checkBackend(true)}
          className="rounded bg-black/15 px-2 py-0.5 hover:bg-black/25 transition-colors font-bold"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          title="Dismiss banner"
          className="rounded-full p-1 hover:bg-black/20 transition-colors text-black"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
