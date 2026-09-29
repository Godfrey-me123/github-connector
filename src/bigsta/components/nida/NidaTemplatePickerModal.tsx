import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  Eye,
  Plus,
  Layers,
  Sparkles,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import { CardTemplate, CardSide } from '../../types';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';
import { useTemplateStore } from '../../store/useTemplateStore';
import { renderTemplateToCanvas } from '../../utils/export';

interface NidaTemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSide: 'front' | 'back';
  selectedTemplateId: string | null;
  onSelectTemplate: (template: CardTemplate) => void;
}

export const NidaTemplatePickerModal: React.FC<NidaTemplatePickerModalProps> = ({
  isOpen,
  onClose,
  targetSide,
  selectedTemplateId,
  onSelectTemplate,
}) => {
  const { loadSavedTemplates, setActiveScreen } = useTemplateStore();
  const [allTemplates, setAllTemplates] = useState<CardTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'matching' | 'samples' | 'saved'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<CardTemplate | null>(null);
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadSavedTemplates().then((saved) => {
        setAllTemplates(saved);

        // Pre-render thumbnails for templates
        saved.forEach((tpl) => {
          renderTemplateToCanvas(tpl, {}, 72)
            .then((canvas) => {
              setThumbnails((prev) => ({
                ...prev,
                [tpl.id]: canvas.toDataURL('image/png'),
              }));
            })
            .catch((err) => {
              console.warn('Could not generate thumbnail for', tpl.id, err);
            });
        });
      });
    }
  }, [isOpen, loadSavedTemplates]);

  // Generate preview image when previewTemplate changes
  useEffect(() => {
    if (previewTemplate) {
      renderTemplateToCanvas(previewTemplate, {}, 200)
        .then((canvas) => {
          setPreviewImgUrl(canvas.toDataURL('image/png'));
        })
        .catch((err) => {
          console.warn('Could not generate preview for', previewTemplate.id, err);
          setPreviewImgUrl(null);
        });
    } else {
      setPreviewImgUrl(null);
    }
  }, [previewTemplate]);

  if (!isOpen) return null;

  const targetLabel = targetSide === 'front' ? 'Front Side' : 'Back Side';

  const filteredTemplates = allTemplates.filter((tpl) => {
    const matchesSearch =
      tpl.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.cardType && tpl.cardType.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    const isTargetSide =
      targetSide === 'front'
        ? tpl.side === 'Front Side' || !tpl.id.toLowerCase().includes('back')
        : tpl.side === 'Back Side' || tpl.id.toLowerCase().includes('back');

    if (activeFilter === 'matching') return isTargetSide;
    if (activeFilter === 'samples') return tpl.id.startsWith('sample_');
    if (activeFilter === 'saved') return !tpl.id.startsWith('sample_');
    return true;
  });

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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#0E1013] border border-[#30363D] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white font-sans cursor-default"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#21262D] flex items-center justify-between bg-[#161B22]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#47A5FF]/10 border border-[#47A5FF]/30 flex items-center justify-center text-[#47A5FF]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Select {targetLabel} Template
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#47A5FF]/20 text-[#47A5FF] border border-[#47A5FF]/30">
                  {targetLabel}
                </span>
              </div>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Choose a template design for automated NIDA {targetSide} population
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors cursor-pointer"
            aria-label="Close template picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-[#C8C2BE] bg-[#E7E2DE] flex flex-col sm:flex-row items-center gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-[#101010]/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FFFFFF] border border-[#C8C2BE] rounded-xl text-xs text-[#101010] placeholder-[#101010]/50 focus:outline-none focus:border-[#101010] focus:ring-1 focus:ring-[#101010] transition-all font-semibold"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#101010] text-[#FFFFFF]'
                  : 'bg-[#FFFFFF] text-[#101010]/70 hover:text-[#101010] hover:bg-[#F5F2EF]'
              }`}
            >
              All ({allTemplates.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('matching')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'matching'
                  ? 'bg-[#101010] text-[#FFFFFF]'
                  : 'bg-[#FFFFFF] text-[#101010]/70 hover:text-[#101010] hover:bg-[#F5F2EF]'
              }`}
            >
              Recommended {targetLabel}
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('samples')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'samples'
                  ? 'bg-[#101010] text-[#FFFFFF]'
                  : 'bg-[#FFFFFF] text-[#101010]/70 hover:text-[#101010] hover:bg-[#F5F2EF]'
              }`}
            >
              Samples
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('saved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'saved'
                  ? 'bg-[#101010] text-[#FFFFFF]'
                  : 'bg-[#FFFFFF] text-[#101010]/70 hover:text-[#101010] hover:bg-[#F5F2EF]'
              }`}
            >
              My Saved
            </button>
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredTemplates.length === 0 ? (
            <div className="py-16 text-center text-[#8B949E] space-y-3">
              <Layers className="w-10 h-10 mx-auto text-[#484F58]" />
              <p className="text-sm font-medium">No templates match your search criteria.</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setActiveScreen('upload');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#47A5FF]/15 text-[#47A5FF] border border-[#47A5FF]/30 text-xs font-bold hover:bg-[#47A5FF]/25 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Template</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((tpl, idx) => {
                const isSelected = selectedTemplateId === tpl.id;
                const thumb = thumbnails[tpl.id];
                const isNida = tpl.id.toLowerCase().includes('nida') || tpl.templateName.toLowerCase().includes('nida');

                return (
                  <div
                    key={`${tpl.id}-${idx}`}
                    onClick={() => {
                      onSelectTemplate(tpl);
                      onClose();
                    }}
                    className={`group relative flex flex-col bg-[#161B22] border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-lg ${
                      isSelected
                        ? 'border-[#47A5FF] shadow-[0_0_20px_rgba(71,165,255,0.25)] ring-1 ring-[#47A5FF]'
                        : 'border-[#30363D] hover:border-[#47A5FF]/60'
                    }`}
                  >
                    {/* Thumbnail Display */}
                    <div className="relative aspect-[85.6/53.98] w-full bg-[#090A0D] flex items-center justify-center overflow-hidden border-b border-[#30363D]">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={tpl.templateName}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-[#8B949E]">
                          <CreditCard className="w-8 h-8 opacity-40" />
                          <span className="text-[10px]">Loading preview...</span>
                        </div>
                      )}

                      {/* Selected Indicator Badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#47A5FF] text-black font-bold text-[10px] flex items-center gap-1 shadow-md">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </div>
                      )}

                      {/* Quick Preview Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTemplate(tpl);
                        }}
                        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white/80 hover:text-white border border-white/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer text-[10px] flex items-center gap-1"
                        title="Quick Fullscreen Preview"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Preview</span>
                      </button>
                    </div>

                    {/* Metadata Card Footer */}
                    <div className="p-3 flex flex-col justify-between flex-1 gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {isNida && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FF8F00]/20 text-[#FF8F00] border border-[#FF8F00]/40">
                              NIDA Standard
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#47A5FF]/15 text-[#47A5FF] border border-[#47A5FF]/30">
                            {tpl.side || (tpl.id.includes('back') ? 'Back Side' : 'Front Side')}
                          </span>
                          <span className="text-[10px] text-[#8B949E]">
                            {tpl.layers.length} layers
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-white truncate" title={tpl.templateName}>
                          {tpl.templateName}
                        </h3>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 border-t border-[#30363D]/60 flex items-center justify-between">
                        <span className="text-[10px] text-[#8B949E] font-mono">
                          {tpl.cardWidth} × {tpl.cardHeight} mm
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTemplate(tpl);
                            onClose();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-[#47A5FF] text-black hover:bg-[#388CE0]'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Use Template'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 border-t border-[#21262D] bg-[#161B22]/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#8B949E]">
            Can't find what you need? Create a new design or upload a background image.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveScreen('upload');
              }}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-[#30363D] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#47A5FF]" />
              <span>+ Create New Template</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Quick Full-Screen Preview Sub-Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
          <div className="relative max-w-2xl w-full bg-[#111317] border border-[#30363D] rounded-2xl p-5 text-white flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{previewTemplate.templateName}</h3>
                <p className="text-xs text-[#8B949E]">
                  {previewTemplate.cardWidth} × {previewTemplate.cardHeight} mm • {previewTemplate.layers.length} Layers
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-[85.6/53.98] w-full bg-black rounded-xl overflow-hidden flex items-center justify-center border border-[#30363D]">
              {previewImgUrl ? (
                <img
                  src={previewImgUrl}
                  alt={previewTemplate.templateName}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-xs text-[#8B949E]">Generating preview...</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-xs font-bold text-white transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTemplate(previewTemplate);
                  setPreviewTemplate(null);
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-[#47A5FF] hover:bg-[#388CE0] text-xs font-bold text-black transition-colors"
              >
                Select This Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
