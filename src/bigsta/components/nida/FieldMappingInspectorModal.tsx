import React, { useState } from 'react';
import {
  ShieldAlert,
  X,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Image as ImageIcon,
  Type,
  Maximize2,
  Eye,
  Info,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import { CardTemplate } from '../../types';
import { NidaFormData, SupportedBinding } from '../../utils/templateMappingEngine';
import { inspectTemplateMapping, FieldMappingReportItem } from '../../utils/fieldMappingInspectorUtils';

interface FieldMappingInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  frontTemplate: CardTemplate;
  backTemplate: CardTemplate | null;
  formData: NidaFormData;
  selectedFieldId: SupportedBinding | null;
  onSelectField: (fieldId: SupportedBinding | null) => void;
}

export const FieldMappingInspectorModal: React.FC<FieldMappingInspectorModalProps> = ({
  isOpen,
  onClose,
  frontTemplate,
  backTemplate,
  formData,
  selectedFieldId,
  onSelectField,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'front' | 'back' | 'gender'>('all');

  if (!isOpen) return null;

  const report = inspectTemplateMapping(frontTemplate, backTemplate, formData);

  const filteredItems = report.allReportItems.filter((item) => {
    if (activeTab === 'front') return item.side === 'Front';
    if (activeTab === 'back') return item.side === 'Back';
    if (activeTab === 'gender') return item.fieldId === 'GENDER';
    return true;
  });

  return (
    <div
      id="dev-field-mapping-inspector-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto font-sans"
    >
      <div className="relative w-full max-w-5xl bg-[#0C0E12] border-2 border-[#FF8F00]/60 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Developer Badge */}
        <div className="px-5 py-4 bg-[#14171E] border-b border-[#4C5055]/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FF8F00]/15 border border-[#FF8F00]/40 text-[#FF8F00]">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Field Mapping & Data Inspector
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#FF8F00]/20 border border-[#FF8F00]/40 text-[#FF8F00] text-[10px] font-mono font-bold uppercase tracking-wider">
                  Development Mode Only
                </span>
              </div>
              <p className="text-xs text-[#A0A4A8] mt-0.5">
                Exact translation of NIDA form inputs to template layers (Front & Back)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-[#4C5055]/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation / Filter Tabs */}
        <div className="px-5 py-2.5 bg-[#0F1217] border-b border-[#4C5055]/40 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-[#14171E] rounded-xl border border-[#4C5055]/50">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all' ? 'bg-[#47A5FF] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Fields ({report.allReportItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('front')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'front' ? 'bg-[#47A5FF] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Front Side ({report.frontReport.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('back')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'back' ? 'bg-[#47A5FF] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Back Side ({report.backReport.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gender')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'gender' ? 'bg-[#FF8F00] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gender Focus (M / F)
            </button>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>Front: <strong className="text-white">{frontTemplate.templateName}</strong></span>
            {backTemplate && (
              <span>• Back: <strong className="text-white">{backTemplate.templateName}</strong></span>
            )}
          </div>
        </div>

        {/* Body Content / Table & Cards */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Highlight Notification */}
          {selectedFieldId && (
            <div className="p-3 bg-[#47A5FF]/15 border border-[#47A5FF]/40 rounded-2xl flex items-center justify-between gap-3 text-xs text-[#47A5FF]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#47A5FF] animate-pulse" />
                <span>
                  Visual Highlight active for: <strong>{selectedFieldId}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectField(null)}
                className="underline hover:text-white font-medium cursor-pointer"
              >
                Clear Highlight
              </button>
            </div>
          )}

          {/* Table of Mappings */}
          <div className="space-y-3">
            {filteredItems.map((item, idx) => {
              const isSelected = selectedFieldId === item.fieldId;
              const isGender = item.fieldId === 'GENDER';

              return (
                <div
                  key={`${item.fieldId}-${item.side}-${idx}`}
                  onClick={() => onSelectField(isSelected ? null : item.fieldId)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#182230] border-[#47A5FF] shadow-[0_0_20px_rgba(71,165,255,0.25)]'
                      : isGender
                      ? 'bg-[#151922] border-[#FF8F00]/50 hover:border-[#FF8F00]'
                      : 'bg-[#11141A] border-[#4C5055]/50 hover:border-[#47A5FF]/50'
                  }`}
                >
                  {/* Card Row Header */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider ${
                          item.side === 'Front'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {item.side} Side
                      </span>

                      <div className="flex items-center gap-1.5">
                        {item.layerType === 'text' ? (
                          <Type className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-amber-400" />
                        )}
                        <h3 className="text-sm font-bold text-white tracking-tight">
                          {item.fieldLabel} <span className="text-[#A0A4A8] font-mono text-xs">({item.fieldId})</span>
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectField(isSelected ? null : item.fieldId);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                          isSelected
                            ? 'bg-[#47A5FF] text-white shadow-sm'
                            : 'bg-white/5 text-slate-300 hover:text-white border border-[#4C5055]/50'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isSelected ? 'Highlighted on Card' : 'Highlight Element'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Grid of Exact Template Properties */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 text-xs">
                    {/* Form Value */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] uppercase font-bold text-[#A0A4A8] block">Form Value</span>
                      <span className="font-mono font-bold text-white truncate block" title={item.formValue}>
                        {item.formValue || '<Empty>'}
                      </span>
                    </div>

                    {/* Final Rendered Value */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] uppercase font-bold text-[#A0A4A8] block">Final Value</span>
                      <span
                        className={`font-mono font-bold truncate block ${
                          isGender ? 'text-[#FF8F00] text-sm' : 'text-emerald-400'
                        }`}
                        title={item.finalRenderedValue}
                      >
                        {item.finalRenderedValue || '<Empty>'}
                      </span>
                    </div>

                    {/* Template Layer ID */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] uppercase font-bold text-[#A0A4A8] block">Template Layer ID</span>
                      <span className="font-mono text-slate-300 truncate block" title={item.layerId}>
                        {item.layerId}
                      </span>
                    </div>

                    {/* Coordinates X, Y */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] uppercase font-bold text-[#A0A4A8] block">Position (X, Y)</span>
                      <span className="font-mono text-slate-300 block">
                        X: {item.x}mm, Y: {item.y}mm
                      </span>
                    </div>

                    {/* Dimensions Width x Height */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] uppercase font-bold text-[#A0A4A8] block">Size (W × H)</span>
                      <span className="font-mono text-slate-300 block">
                        {item.width} × {item.height}mm
                      </span>
                    </div>

                    {/* Typography / Format */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] uppercase font-bold text-[#A0A4A8] block">Font / Style</span>
                      <span className="font-mono text-slate-300 truncate block">
                        {item.layerType === 'text'
                          ? `${item.fontFamily || 'Inter'}, ${item.fontSize}pt, ${item.fontWeight}`
                          : item.layerType}
                      </span>
                    </div>
                  </div>

                  {/* Image Metadata Specifications (if Photo or Signature) */}
                  {item.imageMetadata && (
                    <div className="mt-3 p-3 bg-black/60 rounded-xl border border-white/5 text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">File Type:</span>
                        <span className="font-mono text-white">{item.imageMetadata.originalFileType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Box:</span>
                        <span className="font-mono text-white">
                          {item.imageMetadata.targetWidth} × {item.imageMetadata.targetHeight}mm @ ({item.imageMetadata.targetX}, {item.imageMetadata.targetY})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Scaling Mode:</span>
                        <span className="font-mono text-white">{item.imageMetadata.scalingMode}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Transparency:</span>
                        <span className="font-mono text-emerald-400">{item.imageMetadata.transparencyStatus}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#14171E] border-t border-[#4C5055]/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Info className="w-4 h-4 text-[#47A5FF]" />
            <span>Click any item to visually highlight and inspect coordinates on the live card stage.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#47A5FF] hover:bg-[#368FE6] text-white font-bold transition-all cursor-pointer shadow-md"
          >
            Done Inspecting
          </button>
        </div>
      </div>
    </div>
  );
};
