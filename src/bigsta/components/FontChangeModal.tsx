import React, { useState, useEffect } from 'react';
import { X, Type, Check, Layers, AlertCircle } from 'lucide-react';
import { FontScope, getStoredFontScope, setStoredFontScope } from '../utils/fonts';
import { Layer } from '../types';

interface FontChangeModalProps {
  isOpen: boolean;
  pendingFont: string;
  onClose: () => void;
  onApply: (scope: FontScope) => void;
  selectedLayerName?: string;
  textLayers: Layer[];
}

export const FontChangeModal: React.FC<FontChangeModalProps> = ({
  isOpen,
  pendingFont,
  onClose,
  onApply,
  selectedLayerName,
  textLayers,
}) => {
  const [selectedScope, setSelectedScope] = useState<FontScope>('selected');

  useEffect(() => {
    if (isOpen) {
      setSelectedScope(getStoredFontScope());
    }
  }, [isOpen]);

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

  const handleApply = () => {
    setStoredFontScope(selectedScope);
    onApply(selectedScope);
    onClose();
  };

  const selectedTextLayerName = selectedLayerName || 'Selected Text Layer';
  const textCount = textLayers.length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden text-slate-100 cursor-default"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Font Change Options</h3>
              <p className="text-xs text-slate-400">
                Selected Font: <span className="text-blue-400 font-semibold" style={{ fontFamily: pendingFont }}>{pendingFont}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-300 font-medium text-xs">
            Apply Font To:
          </p>

          <div className="space-y-3">
            {/* Option 1: Selected Text Only */}
            <label
              onClick={() => setSelectedScope('selected')}
              className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                selectedScope === 'selected'
                  ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/30'
                  : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="mt-0.5 flex items-center justify-center">
                <input
                  type="radio"
                  name="fontScope"
                  value="selected"
                  checked={selectedScope === 'selected'}
                  onChange={() => setSelectedScope('selected')}
                  className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white text-xs flex items-center justify-between">
                  <span>Selected Text Only</span>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">
                    1 Layer
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Change the font only for <strong className="text-slate-200">{selectedTextLayerName}</strong>. All other text layers remain unchanged.
                </p>
              </div>
            </label>

            {/* Option 2: Entire Template */}
            <label
              onClick={() => setSelectedScope('all')}
              className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                selectedScope === 'all'
                  ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/30'
                  : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="mt-0.5 flex items-center justify-center">
                <input
                  type="radio"
                  name="fontScope"
                  value="all"
                  checked={selectedScope === 'all'}
                  onChange={() => setSelectedScope('all')}
                  className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white text-xs flex items-center justify-between">
                  <span>Entire Template</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                    {textCount} Layer{textCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Change all text layers in the current template to <strong className="text-slate-200">{pendingFont}</strong> in one action.
                </p>

                {/* Layer preview list */}
                {textLayers.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap gap-1 text-[10px] text-slate-400">
                    {textLayers.slice(0, 6).map((layer) => (
                      <span
                        key={layer.id}
                        className="px-1.5 py-0.5 bg-slate-800 border border-slate-700/80 rounded font-mono truncate max-w-[120px]"
                      >
                        {layer.name || (layer as any).text}
                      </span>
                    ))}
                    {textLayers.length > 6 && (
                      <span className="px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded font-mono">
                        +{textLayers.length - 6} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="italic">Preserves font sizes, alignment, and letter spacing.</span>
            <span className="text-blue-400 font-mono text-[10px]">Supports Undo</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-900/80 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Apply Font</span>
          </button>
        </div>
      </div>
    </div>
  );
};
