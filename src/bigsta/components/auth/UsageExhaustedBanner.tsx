import React from 'react';
import { ShieldAlert, CreditCard } from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';

export const UsageExhaustedBanner: React.FC = () => {
  const { authRole, currentAuthKey, activePasskeys, setRechargeModalOpen } = useTemplateStore();

  // Find active user passkey
  const userKey = activePasskeys.find(
    (p) => p.role === 'user' && p.key.toLowerCase() === (currentAuthKey || '').toLowerCase()
  );

  const isExhausted =
    authRole === 'user' &&
    userKey &&
    (userKey.remainingUsages ?? 0) <= 0;

  if (!isExhausted || !userKey) return null;

  return (
    <div
      id="usage-exhausted-banner"
      className="w-full bg-[#101010] text-white px-3 sm:px-4 py-1.5 shadow-sm border-b border-[#2C3038] sticky top-0 z-[100] flex items-center justify-between gap-2 text-xs font-sans shrink-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <span className="font-bold text-xs tracking-tight truncate text-white">
          No Tokens Remaining
        </span>
      </div>

      <button
        id="banner-recharge-btn"
        type="button"
        onClick={() => setRechargeModalOpen(true)}
        className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-[#101010] active:scale-95 rounded-lg font-bold text-[11px] sm:text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap"
      >
        <CreditCard className="w-3.5 h-3.5" />
        <span>Recharge</span>
      </button>
    </div>
  );
};
