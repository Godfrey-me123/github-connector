import React from 'react';
import { Ticket, AlertCircle, Wallet, PlusCircle, CheckCircle } from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';

export const UserUsageBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { authRole, currentAuthKey, activePasskeys, setRechargeModalOpen } = useTemplateStore();

  if (authRole !== 'user') return null;

  const userKey = activePasskeys.find(
    (p) => p.role === 'user' && p.key.toLowerCase() === (currentAuthKey || '').toLowerCase()
  );

  const remaining = userKey ? userKey.remainingUsages ?? 0 : 0;
  const status = userKey?.paymentStatus || 'ACTIVE';
  const packageName = userKey?.packageName || 'Standard';

  let badgeColor = 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25';
  if (status === 'PENDING') {
    badgeColor = 'bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30';
  } else if (status === 'EXHAUSTED' || remaining === 0) {
    badgeColor = 'bg-red-500/20 border-red-400/50 text-red-200 hover:bg-red-500/30';
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Account Dashboard Pills */}
      <button
        type="button"
        onClick={() => setRechargeModalOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold tracking-wide shadow-sm font-sans backdrop-blur-md transition-all cursor-pointer ${badgeColor}`}
        title={`Package: ${packageName} | Remaining Usages: ${remaining} | Status: ${status}`}
      >
        <Ticket className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
        
        <div className="flex items-center gap-2 text-[11px]">
          <span className="hidden md:inline-block text-slate-300 font-medium border-r border-white/20 pr-2">
            Pkg: <strong className="text-white font-semibold">{packageName}</strong>
          </span>

          <span>
            Usages: <strong className="font-extrabold font-mono text-white text-xs">{remaining}</strong>
          </span>

          <span className="hidden sm:inline-flex items-center gap-1 border-l border-white/20 pl-2">
            Status:
            {status === 'PENDING' ? (
              <span className="text-amber-300 font-bold flex items-center gap-0.5">
                <AlertCircle className="w-3 h-3 animate-spin text-amber-400" /> Pending
              </span>
            ) : status === 'ACTIVE' ? (
              <span className="text-emerald-300 font-bold flex items-center gap-0.5">
                <CheckCircle className="w-3 h-3 text-emerald-400" /> Active
              </span>
            ) : (
              <span className="text-red-300 font-bold">{status}</span>
            )}
          </span>
        </div>

        {remaining === 0 && status !== 'PENDING' && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded bg-red-600 text-white text-[10px] font-black uppercase flex items-center gap-0.5">
            <PlusCircle className="w-2.5 h-2.5" /> Top Up
          </span>
        )}
      </button>
    </div>
  );
};
