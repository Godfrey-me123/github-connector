import React, { useEffect } from 'react';
import { CheckCircle2, X, Barcode, ShieldCheck, ArrowRight } from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';

export const NidaSuccessToast: React.FC = () => {
  const { nidaSuccessNotification, setNidaSuccessNotification } = useTemplateStore();

  useEffect(() => {
    if (!nidaSuccessNotification) return;

    const timer = setTimeout(() => {
      setNidaSuccessNotification(null);
    }, 7000);

    return () => clearTimeout(timer);
  }, [nidaSuccessNotification, setNidaSuccessNotification]);

  if (!nidaSuccessNotification) return null;

  return (
    <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 w-[92%] sm:w-auto sm:min-w-[420px] max-w-lg animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-[#0F1115]/95 backdrop-blur-md border border-[#47A5FF]/50 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(71,165,255,0.2)] p-3.5 sm:p-4 text-white flex items-start gap-3">
        {/* Success Icon */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-xs sm:text-sm text-white tracking-tight truncate">
              {nidaSuccessNotification.title}
            </h4>
            <span
              className={`text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                nidaSuccessNotification.isBackSide
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-[#47A5FF]/20 text-[#47A5FF] border-[#47A5FF]/40'
              }`}
            >
              {nidaSuccessNotification.isBackSide ? 'Back Side' : 'Front Side'}
            </span>
          </div>

          <p className="text-[11px] sm:text-xs text-[#A0A4A8] mt-1 leading-relaxed">
            {nidaSuccessNotification.message}
          </p>

          <div className="flex items-center gap-3 mt-2 text-[10px] sm:text-[11px] text-[#7D8287]">
            <span className="flex items-center gap-1 text-emerald-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{nidaSuccessNotification.populatedCount} elements populated</span>
            </span>
            <span>•</span>
            <span>Ready for export & print</span>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => setNidaSuccessNotification(null)}
          className="p-1 rounded-lg text-[#A0A4A8] hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
