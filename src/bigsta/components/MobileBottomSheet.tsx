import React, { useState } from 'react';
import { X, Layers, PlusCircle, Palette, Sliders, ChevronUp, ChevronDown } from 'lucide-react';
import { useTemplateStore } from '../store/useTemplateStore';
import { ElementsPanel } from './ElementsPanel';
import { LayersList } from './LayersList';
import { BackgroundsPanel } from './BackgroundsPanel';
import { RightPanel } from './RightPanel';

export const MobileBottomSheet: React.FC = () => {
  const { activeMobileSheet, setActiveMobileSheet, selectedLayerIds, currentTemplate } = useTemplateStore();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!activeMobileSheet) return null;

  const tabs: { id: 'elements' | 'layers' | 'backgrounds' | 'properties'; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'elements', label: 'Elements', icon: <PlusCircle className="w-3.5 h-3.5" /> },
    { id: 'layers', label: 'Layers', icon: <Layers className="w-3.5 h-3.5" />, badge: currentTemplate.layers.length },
    { id: 'backgrounds', label: 'Background', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'properties', label: 'Properties', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="lg:hidden fixed top-14 inset-x-0 bottom-0 z-40 flex flex-col justify-end select-none pointer-events-none">
      {/* Semi-transparent backdrop - starts below toolbar so toolbar is never covered */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px] transition-opacity pointer-events-auto"
        onClick={() => setActiveMobileSheet(null)}
      />

      {/* Slide-Up Bottom Drawer */}
      <div
        className={`relative z-10 bg-slate-900 border-t border-slate-700/80 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 pointer-events-auto transition-all ${
          isExpanded ? 'h-[72vh] max-h-[calc(100dvh-4rem)]' : 'h-[48vh] max-h-[calc(100dvh-4rem)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Grab Handle & Controls */}
        <div className="pt-2 pb-1.5 px-4 flex items-center justify-between shrink-0 border-b border-slate-800/80">
          {/* Quick tab switcher inside sheet */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/60 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeMobileSheet === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMobileSheet(tab.id)}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`text-[9px] font-bold px-1 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Action buttons: Expand/Collapse & Close */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
              title={isExpanded ? 'Compact View' : 'Expand View'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setActiveMobileSheet(null)}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2.5 text-slate-200">
          {activeMobileSheet === 'elements' && <ElementsPanel />}
          {activeMobileSheet === 'layers' && <LayersList isMobile onLayerSelected={() => {}} />}
          {activeMobileSheet === 'backgrounds' && <BackgroundsPanel />}
          {activeMobileSheet === 'properties' && <RightPanel isMobileDrawer />}
        </div>
      </div>
    </div>
  );
};
