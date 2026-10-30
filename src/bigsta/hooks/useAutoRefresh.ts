import { useEffect, useRef } from "react";

/**
 * Re-run `fn` when the screen regains focus, the device comes back online,
 * and every `intervalMs` while visible — so request lists never go stale.
 */
export function useAutoRefresh(fn: () => unknown, intervalMs = 30000) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const run = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        void ref.current();
      } catch {
        /* never break the screen */
      }
    };
    const onVis = () => document.visibilityState === "visible" && run();
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(run, intervalMs);
    return () => {
      window.removeEventListener("focus", run);
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, [intervalMs]);
}
