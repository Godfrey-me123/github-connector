import { useEffect, useState } from "react";
import { WifiOff, ServerCrash } from "lucide-react";
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
 */
export function ConnectivityBanner() {
  const [state, setState] = useState<ConnectivityState>("unknown");

  useEffect(() => {
    setState(getConnectivity().state);
    const unsub = subscribeConnectivity((s) => setState(s.state));
    const stop = startConnectivityMonitor();
    return () => {
      unsub();
      stop();
    };
  }, []);

  if (state !== "offline" && state !== "backend-down") return null;

  const offline = state === "offline";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black shadow"
    >
      {offline ? <WifiOff size={14} /> : <ServerCrash size={14} />}
      <span>
        {offline
          ? "Offline — PDF tools, DOCX→PDF, Passport Studio and saved templates still work. Payments and requests need internet."
          : "Server unreachable — local tools still work. Payments and requests will wait until it's back."}
      </span>
      <button
        type="button"
        onClick={() => void checkBackend(true)}
        className="ml-2 rounded bg-black/15 px-2 py-0.5 hover:bg-black/25"
      >
        Retry
      </button>
    </div>
  );
}
