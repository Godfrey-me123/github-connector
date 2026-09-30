import React from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, Eye, Layers, ShieldCheck, X } from 'lucide-react';
import { PopulatedTemplateResult } from '../../utils/templateMappingEngine';

export interface MappingResultModalProps {
  isOpen: boolean;
  result: PopulatedTemplateResult | null;
  onClose: () => void;
  onOpenEditor: () => void;
}

export const MappingResultModal: React.FC<MappingResultModalProps> = ({
  isOpen,
  result,
  onClose,
  onOpenEditor,
}) => {
  if (!isOpen || !result) return null;

  const { plan, populatedCount, warnings } = result;

  return (
    <div
      id="mapping-result-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="mapping-result-modal-card"
        className="relative w-full max-w-lg bg-gradient-to-b from-[#14161B] to-[#0A0B0E] border border-[#4C5055]/80 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] p-6 sm:p-7 text-[#FFFFFF] overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#4C5055]/40 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#FFFFFF]">Template Auto-Fill Complete</h2>
              <p className="text-xs text-[#A0A4A8]">
                Applied to: <span className="font-semibold text-white">{plan.templateName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7D8287] hover:text-[#FFFFFF] hover:bg-[#4C5055]/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto pr-1 space-y-4 text-xs flex-1">
          {/* Status summary pill */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[11px] text-[#A0A4A8]">Populated Elements</div>
                <div className="text-sm font-bold text-emerald-400">{populatedCount} Fields</div>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
              warnings.length > 0
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <div>
                <div className="text-[11px] text-[#A0A4A8]">Missing Placeholders</div>
                <div className="text-sm font-bold">{plan.missingBindings.length} Skipped</div>
              </div>
            </div>
          </div>

          {/* Warnings list if any */}
          {warnings.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-amber-200">
              <div className="font-semibold text-[11px] flex items-center gap-1.5 mb-1 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Field Warnings:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/90 leading-relaxed">
                {warnings.map((w, i) => (
                  <li key={`${w}-${i}`}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Successfully Matched Fields */}
          <div>
            <div className="text-[11px] font-semibold text-[#A0A4A8] uppercase tracking-wider mb-2">
              Mapped Template Placeholders ({plan.fieldMappings.length}):
            </div>
            <div className="space-y-1.5">
              {plan.fieldMappings.map((m, idx) => (
                <div
                  key={m.binding || idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#0A0B0E] border border-[#4C5055]/40"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#47A5FF]/15 text-[#47A5FF] border border-[#47A5FF]/30">
                      {m.binding}
                    </span>
                    <span className="text-[#A0A4A8]">{m.layerName}</span>
                  </div>
                  <span className="text-[11px] font-medium text-white max-w-[140px] truncate text-right">
                    {m.newValue ? m.newValue.slice(0, 20) + (m.newValue.length > 20 ? '...' : '') : '(empty)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-[#4C5055]/40 mt-4 flex gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenEditor}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#47A5FF] to-[#2563eb] hover:from-[#5cb3ff] hover:to-[#3b82f6] text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Open in Editor & Export</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-[#1C1F22] hover:bg-[#282C31] border border-[#4C5055]/70 text-[#A0A4A8] hover:text-white text-xs font-semibold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
