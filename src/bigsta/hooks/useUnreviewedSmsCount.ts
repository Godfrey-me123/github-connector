import { useEffect, useState } from 'react';
import { countUnreviewedSms, subscribeSmsTransactions } from '../services/smsReceiver';

export function useUnreviewedSmsCount(enabled = true): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const refresh = () => {
      countUnreviewedSms().then((n) => {
        if (active) setCount(n);
      });
    };
    refresh();
    const unsubscribe = subscribeSmsTransactions(refresh);
    const interval = setInterval(refresh, 30000);
    return () => {
      active = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [enabled]);

  return count;
}
