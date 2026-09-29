import React, { useState, useEffect } from 'react';
import { Copy, Check, X, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface VehicleClassItem {
  classCode: string;
  enabled: boolean;
  issueDate: string;
  expiryDate: string;
}

interface CopyToModalProps {
  isOpen: boolean;
  sourceClassCode: string;
  sourceIssueDate: string;
  sourceExpiryDate: string;
  allClasses: VehicleClassItem[];
  onApply: (targetClassCodes: string[]) => void;
  onClose: () => void;
}

export const CopyToModal: React.FC<CopyToModalProps> = ({
  isOpen,
  sourceClassCode,
  sourceIssueDate,
  sourceExpiryDate,
  allClasses,
  onApply,
  onClose,
}) => {
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);

  // Initialize selected codes when modal opens (default select all other classes or empty)
  useEffect(() => {
    if (isOpen) {
      // Preselect all other classes by default or leave clean
      const others = allClasses.filter((c) => c.classCode !== sourceClassCode).map((c) => c.classCode);
      setSelectedCodes(others);
      setShowOverwriteWarning(false);
    }
  }, [isOpen, sourceClassCode, allClasses]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleSelect = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAll = () => {
    const others = allClasses.filter((c) => c.classCode !== sourceClassCode).map((c) => c.classCode);
    setSelectedCodes(others);
  };

  const deselectAll = () => {
    setSelectedCodes([]);
  };

  // Check if any selected target already has non-empty dates
  const hasExistingDates = selectedCodes.some((code) => {
    const target = allClasses.find((c) => c.classCode === code);
    return target && (target.issueDate.trim().length > 0 || target.expiryDate.trim().length > 0);
  });

  const handleConfirmApply = () => {
    if (hasExistingDates && !showOverwriteWarning) {
      setShowOverwriteWarning(true);
      return;
    }
    onApply(selectedCodes);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#FFFFFF] border border-[#C8C2BE] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#C8C2BE] flex items-center justify-between bg-[#F8F6F4]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#101010] text-white">
              <Copy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#101010]">
                Copy Class {sourceClassCode} Dates to Other Classes
              </h3>
              <p className="text-[11px] text-[#101010]/70 font-medium">
                Issue Date: <span className="font-mono font-bold text-[#101010]">{sourceIssueDate || 'Not set'}</span> | Expiry Date: <span className="font-mono font-bold text-[#101010]">{sourceExpiryDate || 'Not set'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#101010]/60 hover:text-[#101010] rounded-lg hover:bg-[#E7E2DE] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 bg-[#FFFFFF]">
          {/* Quick Action Bar */}
          <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E7E2DE]">
            <span className="font-bold text-[#101010]">
              Target Classes ({selectedCodes.length} selected):
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1 rounded-lg bg-[#E7E2DE] hover:bg-[#D8D2CE] text-[#101010] text-[11px] font-bold transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="px-2.5 py-1 rounded-lg bg-[#E7E2DE] hover:bg-[#D8D2CE] text-[#101010] text-[11px] font-bold transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Overwrite warning prompt if existing dates detected */}
          {showOverwriteWarning && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Overwrite Warning!</p>
                <p className="mt-0.5 text-[11px] text-amber-800">
                  Some selected classes already have manually entered issue or expiry dates. Proceeding will overwrite those dates with Class {sourceClassCode} dates ({sourceIssueDate} - {sourceExpiryDate}).
                </p>
              </div>
            </div>
          )}

          {/* Grid of 13 Vehicle Classes Checkboxes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {allClasses.map((item) => {
              const isSource = item.classCode === sourceClassCode;
              const isSelected = selectedCodes.includes(item.classCode);
              const hasDates = item.issueDate || item.expiryDate;

              if (isSource) {
                return (
                  <div
                    key={item.classCode}
                    className="p-3 rounded-2xl bg-amber-50 border border-amber-300 opacity-60 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold font-mono text-amber-900">
                        Class {item.classCode}
                      </span>
                      <span className="block text-[10px] text-amber-700 font-semibold">
                        (Source)
                      </span>
                    </div>
                    <Check className="w-4 h-4 text-amber-700" />
                  </div>
                );
              }

              return (
                <button
                  key={item.classCode}
                  type="button"
                  onClick={() => toggleSelect(item.classCode)}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#101010] text-white border-[#101010] shadow-xs'
                      : 'bg-[#F8F6F4] hover:bg-[#E7E2DE] text-[#101010] border-[#C8C2BE]'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold font-mono block">
                      Class {item.classCode}
                    </span>
                    {hasDates && (
                      <span
                        className={`text-[9px] font-semibold block ${
                          isSelected ? 'text-amber-300' : 'text-amber-700'
                        }`}
                      >
                        Has dates
                      </span>
                    )}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                      isSelected
                        ? 'bg-amber-400 border-amber-400 text-[#101010]'
                        : 'border-[#C8C2BE] bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 font-bold" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="px-5 py-4 border-t border-[#C8C2BE] bg-[#F8F6F4] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#E7E2DE] text-[#101010] border border-[#C8C2BE] text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmApply}
            disabled={selectedCodes.length === 0}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              selectedCodes.length > 0
                ? 'bg-[#101010] hover:bg-[#252525] shadow-sm'
                : 'bg-gray-400 cursor-not-allowed opacity-50'
            }`}
          >
            <Copy className="w-4 h-4 text-amber-400" />
            <span>
              {showOverwriteWarning
                ? 'Confirm & Overwrite'
                : `Apply to ${selectedCodes.length} Classes`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
