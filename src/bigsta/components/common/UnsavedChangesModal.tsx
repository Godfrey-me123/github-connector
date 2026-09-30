import React from 'react';
import { AlertTriangle, Save, Trash2, X } from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';

export const UnsavedChangesModal: React.FC = () => {
  const { isUnsavedModalOpen, confirmPendingNavigation, cancelPendingNavigation } = useTemplateStore();

  // Escape key listener
  React.useEffect(() => {
    if (!isUnsavedModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelPendingNavigation();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUnsavedModalOpen, cancelPendingNavigation]);

  if (!isUnsavedModalOpen) return null;

  return (
    <div
      onClick={cancelPendingNavigation}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-[#E7E9EB] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 cursor-default relative"
      >
        <button
          onClick={cancelPendingNavigation}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#555555] hover:text-[#000000] hover:bg-[#E7E9EB] transition-colors cursor-pointer"
          title="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>
        {/* Header Icon */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#000000]">You have unsaved changes</h3>
            <p className="text-xs text-[#555555]">
              You have unsaved modifications in your Studio template draft.
            </p>
          </div>
        </div>

        <p className="text-xs text-[#333333] leading-relaxed bg-[#F8FAFC] p-3 rounded-xl border border-[#E7E9EB]">
          Leaving now without saving will lose your recent element edits, style updates, or background changes.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
          <button
            onClick={cancelPendingNavigation}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-[#555555] hover:bg-[#E7E9EB] rounded-xl transition-colors cursor-pointer"
          >
            Stay Here & Continue
          </button>
          <button
            onClick={() => confirmPendingNavigation(false)}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Discard Changes</span>
          </button>
          <button
            onClick={() => confirmPendingNavigation(true)}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-[#000000] hover:bg-[#222222] rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save & Proceed</span>
          </button>
        </div>
      </div>
    </div>
  );
};
