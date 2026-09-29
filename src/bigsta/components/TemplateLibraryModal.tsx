import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  FolderOpen,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  ArrowRight,
  FileJson,
  CreditCard,
  Edit,
} from 'lucide-react';
import { useTemplateStore } from '../store/useTemplateStore';
import { CardTemplate } from '../types';
import { downloadJSON } from '../utils/export';

import { TemplateBadge } from './TemplateBadge';

export const TemplateLibraryModal: React.FC = () => {
  const {
    isTemplateLibraryOpen,
    setTemplateLibraryOpen,
    loadSavedTemplates,
    loadTemplate,
    deleteSavedTemplate,
    saveCurrentTemplate,
    setActiveScreen,
  } = useTemplateStore();

  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'private' | 'universal'>('private');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isTemplateLibraryOpen) {
      loadSavedTemplates().then(setTemplates);
    }
  }, [isTemplateLibraryOpen, loadSavedTemplates]);

  // Escape key listener
  useEffect(() => {
    if (!isTemplateLibraryOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTemplateLibraryOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTemplateLibraryOpen, setTemplateLibraryOpen]);

  if (!isTemplateLibraryOpen) return null;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteSavedTemplate(id);
      const updated = await loadSavedTemplates();
      setTemplates(updated);
    }
  };

  const handleDuplicate = async (tpl: CardTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy: CardTemplate = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: 'template_' + Date.now(),
      templateName: `${tpl.templateName} Copy`,
      visibility: 'private',
      isUniversal: false,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    loadTemplate(copy);
    await saveCurrentTemplate();
    const updated = await loadSavedTemplates();
    setTemplates(updated);
  };

  const handleExportJSON = (tpl: CardTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadJSON(tpl);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.cardWidth && parsed.cardHeight && Array.isArray(parsed.layers)) {
            const imported: CardTemplate = {
              id: 'template_' + Date.now(),
              templateName: parsed.templateName || 'Imported Template',
              cardWidth: parsed.cardWidth,
              cardHeight: parsed.cardHeight,
              unit: parsed.unit || 'mm',
              dpi: parsed.dpi || 300,
              orientation: parsed.cardWidth >= parsed.cardHeight ? 'landscape' : 'portrait',
              background: parsed.background || { type: 'color', color: '#ffffff' },
              layers: parsed.layers,
              guides: parsed.guides || [],
              visibility: 'private',
              isUniversal: false,
              status: 'draft',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            loadTemplate(imported);
            await saveCurrentTemplate();
            setTemplateLibraryOpen(false);
          } else {
            alert('Invalid JSON template format.');
          }
        } catch {
          alert('Could not parse JSON file.');
        }
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const privateTemplates = templates.filter((t) => t.visibility === 'private' || !t.isUniversal);
  const universalTemplates = templates.filter((t) => t.visibility === 'universal' || t.isUniversal);

  const currentTabList = activeTab === 'private' ? privateTemplates : universalTemplates;
  const filtered = currentTabList.filter((t) =>
    t.templateName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      onClick={() => setTemplateLibraryOpen(false)}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">My ID Templates</h2>
              <p className="text-xs text-slate-400">
                Select, edit, or import reusable ID card template designs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Import JSON</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </button>

            <button
              onClick={() => setTemplateLibraryOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs: Private vs Universal */}
        <div className="px-6 pt-4 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('private')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'private'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <span>My Private Templates</span>
            <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px] font-mono">
              {privateTemplates.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('universal')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'universal'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <span>Universal Published Templates</span>
            <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px] font-mono">
              {universalTemplates.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-800 bg-slate-900">
          <input
            type="text"
            placeholder="Search templates by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Template List Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 text-sm">
              No templates found. Create or import a new template to get started!
            </div>
          ) : (
            filtered.map((tpl, idx) => (
              <div
                key={`${tpl.id}-${idx}`}
                onClick={() => {
                  loadTemplate(tpl);
                  setTemplateLibraryOpen(false);
                  setActiveScreen('editor');
                }}
                className="group p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500 rounded-xl transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors truncate">
                      {tpl.templateName}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                      {tpl.orientation}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-2">
                    Dimensions: {tpl.cardWidth} × {tpl.cardHeight} mm | {tpl.layers.length} Layers
                  </p>
                  <TemplateBadge cardType={tpl.cardType} side={tpl.side} size="sm" />
                </div>

                <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDuplicate(tpl, e)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                      title="Duplicate Template"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleExportJSON(tpl, e)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors"
                      title="Export JSON"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(tpl.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-xs font-semibold text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
