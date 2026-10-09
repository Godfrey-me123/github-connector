import { useEffect, useState } from "react";
import { countUnreviewedSms, subscribeSmsTransactions } from "../services/smsReceiver";

export function useUnreviewedSmsCount(enabled = true): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const refresh = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      try {
        countUnreviewedSms()
          .then((n) => {
            if (active && typeof n === "number") setCount(n);
          })
          .catch(() => {});
      } catch {
        // Safe fallback
      }
    };

    refresh();
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeSmsTransactions(refresh);
    } catch {}

    const interval = setInterval(refresh, 60000);
    return () => {
      active = false;
      try {
        unsubscribe();
      } catch {}
      clearInterval(interval);
    };
  }, [enabled]);

  return count;
}
