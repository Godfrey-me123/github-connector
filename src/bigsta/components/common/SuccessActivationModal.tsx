import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';

export const SuccessActivationModal: React.FC = () => {
  const { successActivationMessage, setSuccessActivationMessage } = useTemplateStore();

  if (!successActivationMessage) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn"
      onClick={() => setSuccessActivationMessage(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden text-center p-6 space-y-4 animate-scaleUp"
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner relative">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          <Sparkles className="w-5 h-5 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
        </div>

        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Congratulations!</h3>
          <p className="text-sm font-semibold text-emerald-700">
            {successActivationMessage || 'Your package has been activated successfully.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSuccessActivationMessage(null)}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl transition-colors shadow-lg shadow-emerald-600/30 cursor-pointer"
        >
          OK
        </button>
      </div>
    </div>
  );
};
