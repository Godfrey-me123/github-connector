import React from 'react';
import { Wrench, X, Mail } from 'lucide-react';

interface UnderDevelopmentModalProps {
  isOpen: boolean;
  serviceName?: string;
  onClose: () => void;
}

export const UnderDevelopmentModal: React.FC<UnderDevelopmentModalProps> = ({
  isOpen,
  serviceName = 'This service',
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#08090B]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#14171D] border border-[#2D3139] rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-[#1A1F26] border-b border-[#2D3139] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white tracking-tight">Service Under Development</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            <strong className="text-white">{serviceName}</strong> is currently under development and is not yet available. Please check back later or contact the administrator for updates.
          </p>
          <p className="text-slate-400 text-xs">
            All unofficial documentation, sample templates, and design tools are regularly updated as new capabilities are deployed.
          </p>
        </div>

        {/* Footer */}
        <div className="p-5 bg-[#1A1F26] border-t border-[#2D3139] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              alert('Contact Administrator: admin@bigsta.portal / support@bigsta.portal');
            }}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>Contact Admin</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold transition-all shadow-md cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
