import React, { useState } from 'react';
import { Plus, Layers, Image as ImageIcon } from 'lucide-react';
import { useTemplateStore } from '../store/useTemplateStore';
import { ElementsPanel } from './ElementsPanel';
import { LayersList } from './LayersList';
import { BackgroundsPanel } from './BackgroundsPanel';

export const LeftPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'elements' | 'layers' | 'backgrounds'>('elements');
  const { currentTemplate } = useTemplateStore();

  return (
    <aside className="hidden lg:flex lg:w-72 bg-slate-900 border-r border-slate-800 flex-col h-[calc(100vh-3.5rem)] select-none text-slate-200 shrink-0">
      {/* Desktop Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1 text-[11px] font-semibold shrink-0">
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
            activeTab === 'elements'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Elements</span>
        </button>

        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
            activeTab === 'layers'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Layers ({currentTemplate.layers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('backgrounds')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
            activeTab === 'backgrounds'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Background</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3 text-slate-200">
        {activeTab === 'elements' && <ElementsPanel />}
        {activeTab === 'layers' && <LayersList />}
        {activeTab === 'backgrounds' && <BackgroundsPanel />}
      </div>
    </aside>
  );
};
