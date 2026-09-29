import React from 'react';
import { useTemplateStore } from '../store/useTemplateStore';
import { convertFromMm, formatUnitValue, mmToPx } from '../utils/units';
import { MousePointer, Crosshair, Magnet, Layers } from 'lucide-react';

export const BottomStatusBar: React.FC = () => {
  const {
    currentTemplate,
    cursorPosMm,
    activeUnit,
    zoom,
    resetView,
    recenterWorkspace,
    snapSettings,
    selectedLayerIds,
  } = useTemplateStore();

  const selectedLayer = currentTemplate.layers.find((l) => selectedLayerIds.includes(l.id));

  const xDisplay = convertFromMm(cursorPosMm.x, activeUnit);
  const yDisplay = convertFromMm(cursorPosMm.y, activeUnit);

  const cardPxW = Math.round(mmToPx(currentTemplate.cardWidth, currentTemplate.dpi || 300));
  const cardPxH = Math.round(mmToPx(currentTemplate.cardHeight, currentTemplate.dpi || 300));

  return (
    <footer className="h-7 bg-slate-950 border-t border-slate-800 px-4 hidden lg:flex items-center justify-between text-[11px] font-mono text-slate-400 select-none z-10 shrink-0">
      {/* Left: Cursor Position & Dimensions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Crosshair className="w-3 h-3 text-blue-400" />
          <span>
            X: {xDisplay.toFixed(1)} {activeUnit} | Y: {yDisplay.toFixed(1)} {activeUnit}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-slate-400">
          <span>
            Card: {currentTemplate.cardWidth} × {currentTemplate.cardHeight} mm ({cardPxW} × {cardPxH} px @ {currentTemplate.dpi} DPI)
          </span>
        </div>
      </div>

      {/* Right: Selection & Snap Status */}
      <div className="flex items-center gap-4">
        {selectedLayer && (
          <div className="hidden md:flex items-center gap-1 text-blue-400 font-semibold truncate max-w-[200px]">
            <Layers className="w-3 h-3" />
            <span className="truncate">{selectedLayer.name}</span>
          </div>
        )}

        <div className="flex items-center gap-1 text-slate-300">
          <Magnet className={`w-3 h-3 ${snapSettings.snapToObjects ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span>Snap: {snapSettings.snapToObjects || snapSettings.snapToGuides ? 'ON' : 'OFF'}</span>
        </div>

        <button
          onClick={resetView}
          className="hover:text-blue-400 transition-colors cursor-pointer font-semibold"
          title="Click to Reset View (Center Card & 100% Zoom)"
        >
          Zoom: {Math.round(zoom * 100)}%
        </button>
      </div>
    </footer>
  );
};
