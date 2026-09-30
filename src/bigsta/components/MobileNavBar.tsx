import React from 'react';
import {
  PlusCircle,
  Layers,
  Palette,
  Sliders,
  Maximize2,
  Copy,
  Trash2,
  X,
  Move,
} from 'lucide-react';
import { useTemplateStore } from '../store/useTemplateStore';

interface MobileNavBarProps {
  onToggleNudgePad?: () => void;
  showNudgePad?: boolean;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({ onToggleNudgePad, showNudgePad }) => {
  const {
    currentTemplate,
    selectedLayerIds,
    selectLayer,
    duplicateSelectedLayers,
    deleteSelectedLayers,
    activeMobileSheet,
    setActiveMobileSheet,
    setZoom,
    setPanOffset,
  } = useTemplateStore();

  const selectedLayer =
    selectedLayerIds.length === 1
      ? currentTemplate.layers.find((l) => l.id === selectedLayerIds[0])
      : null;

  const handleFitScreen = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleToggleSheet = (sheet: 'elements' | 'layers' | 'backgrounds' | 'properties') => {
    if (activeMobileSheet === sheet) {
      setActiveMobileSheet(null);
    } else {
      setActiveMobileSheet(sheet);
    }
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col pointer-events-none select-none">
      {/* Quick Selection Action Bar (Appears when layer is selected on canvas) */}
      {selectedLayerIds.length > 0 && (
        <div className="mx-2 mb-2 p-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-xl flex items-center justify-between pointer-events-auto transition-all animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 pl-2 overflow-hidden flex-1 min-w-0">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-100 truncate">
              {selectedLayer ? selectedLayer.name : `${selectedLayerIds.length} Selected`}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Open Properties Drawer */}
            <button
              onClick={() => handleToggleSheet('properties')}
              className={`h-9 px-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeMobileSheet === 'properties'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Edit</span>
            </button>

            {/* Duplicate */}
            <button
              onClick={duplicateSelectedLayers}
              className="w-9 h-9 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center transition-colors"
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Toggle Precision D-Pad */}
            {onToggleNudgePad && (
              <button
                onClick={onToggleNudgePad}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  showNudgePad
                    ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Precision Nudge Pad"
              >
                <Move className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete */}
            <button
              onClick={deleteSelectedLayers}
              className="w-9 h-9 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl flex items-center justify-center transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Deselect */}
            <button
              onClick={() => selectLayer('', false)}
              className="w-8 h-9 text-slate-400 hover:text-slate-200 flex items-center justify-center"
              title="Deselect"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Bottom Dock (Canva Mobile style) */}
      <nav className="bg-slate-900/98 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around pointer-events-auto shadow-2xl safe-area-bottom">
        {/* Elements Button */}
        <button
          onClick={() => handleToggleSheet('elements')}
          className={`flex-1 min-h-[48px] py-1 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
            activeMobileSheet === 'elements'
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-slate-400 hover:text-slate-200 active:bg-slate-800/60'
          }`}
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Elements</span>
        </button>

        {/* Layers Button */}
        <button
          onClick={() => handleToggleSheet('layers')}
          className={`flex-1 min-h-[48px] py-1 px-1 rounded-xl flex flex-col items-center justify-center gap-1 relative transition-colors ${
            activeMobileSheet === 'layers'
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-slate-400 hover:text-slate-200 active:bg-slate-800/60'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5" />
            {currentTemplate.layers.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-blue-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center leading-tight">
                {currentTemplate.layers.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight">Layers</span>
        </button>

        {/* Background Button */}
        <button
          onClick={() => handleToggleSheet('backgrounds')}
          className={`flex-1 min-h-[48px] py-1 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
            activeMobileSheet === 'backgrounds'
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-slate-400 hover:text-slate-200 active:bg-slate-800/60'
          }`}
        >
          <Palette className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Background</span>
        </button>

        {/* Properties Button */}
        <button
          onClick={() => handleToggleSheet('properties')}
          className={`flex-1 min-h-[48px] py-1 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
            activeMobileSheet === 'properties'
              ? 'text-blue-400 bg-blue-500/10'
              : selectedLayerIds.length > 0
              ? 'text-blue-300 hover:text-white'
              : 'text-slate-400 hover:text-slate-200 active:bg-slate-800/60'
          }`}
        >
          <div className="relative">
            <Sliders className="w-5 h-5" />
            {selectedLayerIds.length > 0 && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-blue-400" />
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight">Properties</span>
        </button>

        {/* Fit Card Button */}
        <button
          onClick={handleFitScreen}
          className="flex-1 min-h-[48px] py-1 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-200 active:bg-slate-800/60 transition-colors"
          title="Fit Card to Screen"
        >
          <Maximize2 className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Fit Card</span>
        </button>
      </nav>
    </div>
  );
};
