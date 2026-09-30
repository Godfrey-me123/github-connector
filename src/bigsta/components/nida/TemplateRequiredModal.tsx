import React from 'react';
import { AlertCircle, PlusCircle, FolderOpen, X, ShieldAlert } from 'lucide-react';

export interface TemplateRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNewTemplate: () => void;
  onUseExistingTemplate: () => void;
}

export const TemplateRequiredModal: React.FC<TemplateRequiredModalProps> = ({
  isOpen,
  onClose,
  onCreateNewTemplate,
  onUseExistingTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="template-required-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="template-required-modal-card"
        className="relative w-full max-w-md bg-gradient-to-b from-[#16181D] to-[#0D0E12] border border-[#4C5055]/80 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] p-6 sm:p-7 text-[#FFFFFF] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Accent Glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#FF8F00]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#47A5FF]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Close */}
        <button
          id="template-required-close-btn"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-[#7D8287] hover:text-[#FFFFFF] hover:bg-[#4C5055]/30 transition-colors"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FF8F00]/15 border border-[#FF8F00]/30 flex items-center justify-center mb-4 text-[#FF8F00] shadow-[0_0_25px_rgba(255,143,0,0.2)]">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h2 id="template-required-title" className="text-xl sm:text-2xl font-bold tracking-tight text-[#FFFFFF]">
            Template Required
          </h2>

          <p id="template-required-message" className="text-sm text-[#A0A4A8] mt-2 max-w-xs leading-relaxed">
            No template has been selected or created.
          </p>
        </div>

        {/* Informative Options Box */}
        <div className="bg-[#090A0D]/70 border border-[#4C5055]/40 rounded-xl p-3.5 mb-6 text-xs text-[#A0A4A8] space-y-1.5">
          <div className="text-[11px] font-semibold text-[#FFFFFF] uppercase tracking-wider mb-1">
            Available Options:
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#47A5FF]/20 text-[#47A5FF] flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Create New Template: Upload background and configure elements.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#FF8F00]/20 text-[#FF8F00] flex items-center justify-center text-[10px] font-bold">2</span>
            <span>Use Existing Template: Pick from pre-configured national ID templates.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {/* Button 1: Navigate to Template Creation Page */}
          <button
            id="btn-create-new-template"
            type="button"
            onClick={onCreateNewTemplate}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#47A5FF] to-[#2563eb] hover:from-[#5cb3ff] hover:to-[#3b82f6] text-[#FFFFFF] text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Template</span>
          </button>

          {/* Button 2: Navigate to Available Templates */}
          <button
            id="btn-use-existing-template"
            type="button"
            onClick={onUseExistingTemplate}
            className="w-full py-3 px-4 rounded-xl bg-[#1C1F22] hover:bg-[#282C31] border border-[#4C5055]/70 hover:border-[#47A5FF]/60 text-[#FFFFFF] text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <FolderOpen className="w-4 h-4 text-[#FF8F00]" />
            <span>Use Existing Template</span>
          </button>

          {/* Cancel */}
          <button
            id="btn-cancel-modal"
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 text-xs font-medium text-[#7D8287] hover:text-[#FFFFFF] transition-colors mt-1"
          >
            Keep Editing Form
          </button>
        </div>
      </div>
    </div>
  );
};
