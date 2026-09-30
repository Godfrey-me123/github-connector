import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Star,
  Plus,
  Layers,
  FileCheck,
  ShieldCheck,
  RefreshCw,
  FolderOpen,
  Info,
  ChevronRight,
} from 'lucide-react';
import { CardTemplate } from '../../types';
import { useTemplateStore } from '../../store/useTemplateStore';
import { SAMPLE_TEMPLATES } from '../../utils/sampleTemplates';
import { renderTemplateToCanvas } from '../../utils/export';
import { NidaTemplatePickerModal } from './NidaTemplatePickerModal';

interface NidaTemplateSelectionStepProps {
  onContinueToForm: (frontTemplate: CardTemplate, backTemplate: CardTemplate) => void;
  onOpenCreateTemplate: () => void;
}

export const NidaTemplateSelectionStep: React.FC<NidaTemplateSelectionStepProps> = ({
  onContinueToForm,
  onOpenCreateTemplate,
}) => {
  const {
    selectedFrontTemplateId,
    selectedBackTemplateId,
    defaultNidaFrontTemplateId,
    defaultNidaBackTemplateId,
    setSelectedFrontTemplateId,
    setSelectedBackTemplateId,
    setUniversalDefaultNidaTemplates,
    loadSavedTemplates,
    setActiveScreen,
  } = useTemplateStore();

  const [allTemplates, setAllTemplates] = useState<CardTemplate[]>(SAMPLE_TEMPLATES);
  const [frontTemplate, setFrontTemplate] = useState<CardTemplate | null>(null);
  const [backTemplate, setBackTemplate] = useState<CardTemplate | null>(null);
  const [frontThumb, setFrontThumb] = useState<string | null>(null);
  const [backThumb, setBackThumb] = useState<string | null>(null);

  const [pickerSide, setPickerSide] = useState<'front' | 'back' | null>(null);
  const [universalSaveToast, setUniversalSaveToast] = useState<string | null>(null);

  // Load all templates (sample + saved)
  useEffect(() => {
    loadSavedTemplates().then((saved) => {
      setAllTemplates(saved);

      // Resolve Front Template
      const targetFrontId =
        selectedFrontTemplateId || defaultNidaFrontTemplateId || 'sample_tanzania_nida';
      const foundFront =
        saved.find((t) => t.id === targetFrontId) ||
        saved.find((t) => !t.id.includes('back')) ||
        saved[0];

      if (foundFront) {
        setFrontTemplate(foundFront);
        setSelectedFrontTemplateId(foundFront.id);
      }

      // Resolve Back Template
      const targetBackId =
        selectedBackTemplateId || defaultNidaBackTemplateId || 'sample_tanzania_nida_back';
      const foundBack =
        saved.find((t) => t.id === targetBackId) ||
        saved.find((t) => t.id.includes('back')) ||
        saved[1] ||
        saved[0];

      if (foundBack) {
        setBackTemplate(foundBack);
        setSelectedBackTemplateId(foundBack.id);
      }
    });
  }, [
    loadSavedTemplates,
    selectedFrontTemplateId,
    selectedBackTemplateId,
    defaultNidaFrontTemplateId,
    defaultNidaBackTemplateId,
    setSelectedFrontTemplateId,
    setSelectedBackTemplateId,
  ]);

  // Render thumbnails whenever front or back templates change
  useEffect(() => {
    if (frontTemplate) {
      renderTemplateToCanvas(frontTemplate, {}, 96)
        .then((canvas) => setFrontThumb(canvas.toDataURL('image/png')))
        .catch(() => setFrontThumb(null));
    }
  }, [frontTemplate]);

  useEffect(() => {
    if (backTemplate) {
      renderTemplateToCanvas(backTemplate, {}, 96)
        .then((canvas) => setBackThumb(canvas.toDataURL('image/png')))
        .catch(() => setBackThumb(null));
    }
  }, [backTemplate]);

  // Handle template selection from picker modal
  const handleSelectTemplate = (template: CardTemplate) => {
    if (pickerSide === 'front') {
      setFrontTemplate(template);
      setSelectedFrontTemplateId(template.id);
    } else if (pickerSide === 'back') {
      setBackTemplate(template);
      setSelectedBackTemplateId(template.id);
    }
  };

  // Check if current pair is the saved universal default
  const isUniversalDefault =
    frontTemplate?.id === defaultNidaFrontTemplateId &&
    backTemplate?.id === defaultNidaBackTemplateId;

  // Handle Universal Save
  const handleUniversalSave = () => {
    if (frontTemplate && backTemplate) {
      setUniversalDefaultNidaTemplates(frontTemplate.id, backTemplate.id);
      setUniversalSaveToast(
        `Universal Defaults Saved! "${frontTemplate.templateName}" and "${backTemplate.templateName}" will automatically preselect on every session.`
      );
      setTimeout(() => setUniversalSaveToast(null), 4000);
    }
  };

  const handleContinue = () => {
    if (frontTemplate && backTemplate) {
      onContinueToForm(frontTemplate, backTemplate);
    }
  };

  const canContinue = !!frontTemplate && !!backTemplate;

  return (
    <div className="space-y-6">
      {/* Introduction Banner */}
      <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#C8C2BE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E7E2DE] border border-[#C8C2BE] flex items-center justify-center shrink-0 mt-0.5 text-[#101010]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[#101010]">
                Step 1: Choose Front & Back Templates
              </h2>
              {isUniversalDefault && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-emerald-700 text-emerald-700" />
                  Universal Default
                </span>
              )}
            </div>
            <p className="text-xs text-[#101010]/70 mt-0.5 font-medium">
              Select the front and back card designs to auto-populate with NIDA data.
            </p>
          </div>
        </div>

        {/* Universal Save Button */}
        <button
          type="button"
          onClick={handleUniversalSave}
          disabled={!canContinue}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
            isUniversalDefault
              ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
              : 'bg-[#E7E2DE] hover:bg-[#dcd6d1] border-[#C8C2BE] text-[#101010]'
          }`}
          title="Save this Front + Back pair as your permanent universal default"
        >
          <Star className={`w-3.5 h-3.5 ${isUniversalDefault ? 'fill-emerald-700 text-emerald-700' : 'text-[#FF6839]'}`} />
          <span>Default</span>
        </button>
      </div>

      {/* Universal Save Toast Alert */}
      {universalSaveToast && (
        <div className="p-3.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{universalSaveToast}</span>
        </div>
      )}

      {/* TWO SEPARATE TEMPLATE SLOTS: FRONT & BACK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* SLOT 1: FRONT TEMPLATE */}
        <div className="p-4 rounded-2xl bg-[#B5A5FF]/20 border border-[#B5A5FF]/50 flex flex-col justify-between space-y-3 relative group hover:border-[#101010] transition-all shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#101010] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#101010]" />
                Front Side Template
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#B5A5FF] text-[#101010] border border-[#101010]/20">
                Primary Identity Side
              </span>
            </div>

            {/* Thumbnail Canvas / Placeholder */}
            <div className="relative aspect-[85.6/53.98] w-full bg-[#FFFFFF] rounded-xl border border-[#C8C2BE] overflow-hidden flex items-center justify-center">
              {frontThumb ? (
                <img
                  src={frontThumb}
                  alt={frontTemplate?.templateName || 'Front Template'}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#101010]/60">
                  <CreditCard className="w-8 h-8 opacity-40 text-[#101010]" />
                  <span className="text-xs font-semibold">No front template selected</span>
                </div>
              )}

              {/* Verified Badge */}
              {frontTemplate && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm border border-[#C8C2BE] text-[10px] font-mono text-[#101010] font-bold">
                  {frontTemplate.cardWidth} × {frontTemplate.cardHeight} mm
                </div>
              )}
            </div>

            {/* Template Info */}
            <div className="mt-3">
              <h3 className="text-sm font-bold text-[#101010] truncate" title={frontTemplate?.templateName}>
                {frontTemplate ? frontTemplate.templateName : 'Select Front Template'}
              </h3>
              <p className="text-[11px] text-[#101010]/70 mt-0.5 font-medium">
                {frontTemplate
                  ? `${frontTemplate.layers.length} layers • ${frontTemplate.cardType || 'National ID'}`
                  : 'Requires identity variables: Name, DOB, Sex (M/F), NIDA, Photo'}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 border-t border-[#C8C2BE] flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPickerSide('front')}
              className="flex-1 px-3 py-2 rounded-xl bg-[#101010] hover:bg-[#252525] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-white" />
              <span>Front</span>
            </button>
          </div>
        </div>

        {/* SLOT 2: BACK TEMPLATE */}
        <div className="p-4 rounded-2xl bg-[#FF9A5A]/20 border border-[#FF9A5A]/50 flex flex-col justify-between space-y-3 relative group hover:border-[#101010] transition-all shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#101010] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF6839]" />
                Back Side Template
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FF9A5A] text-[#101010] border border-[#101010]/20">
                Security & Barcode Side
              </span>
            </div>

            {/* Thumbnail Canvas / Placeholder */}
            <div className="relative aspect-[85.6/53.98] w-full bg-[#FFFFFF] rounded-xl border border-[#C8C2BE] overflow-hidden flex items-center justify-center">
              {backThumb ? (
                <img
                  src={backThumb}
                  alt={backTemplate?.templateName || 'Back Template'}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#101010]/60">
                  <CreditCard className="w-8 h-8 opacity-40 text-[#FF6839]" />
                  <span className="text-xs font-semibold">No back template selected</span>
                </div>
              )}

              {/* Verified Badge */}
              {backTemplate && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm border border-[#C8C2BE] text-[10px] font-mono text-[#101010] font-bold">
                  {backTemplate.cardWidth} × {backTemplate.cardHeight} mm
                </div>
              )}
            </div>

            {/* Template Info */}
            <div className="mt-3">
              <h3 className="text-sm font-bold text-[#101010] truncate" title={backTemplate?.templateName}>
                {backTemplate ? backTemplate.templateName : 'Select Back Template'}
              </h3>
              <p className="text-[11px] text-[#101010]/70 mt-0.5 font-medium">
                {backTemplate
                  ? `${backTemplate.layers.length} layers • ${backTemplate.cardType || 'National ID Back'}`
                  : 'Populates NIDA number, barcode & security details'}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 border-t border-[#C8C2BE] flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPickerSide('back')}
              className="flex-1 px-3 py-2 rounded-xl bg-[#101010] hover:bg-[#252525] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-white" />
              <span>Back</span>
            </button>
          </div>
        </div>

      </div>

      {/* Auxiliary Actions & Continue Button */}
      <div className="p-4 rounded-2xl bg-[#E7E2DE] border border-[#C8C2BE] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenCreateTemplate}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white hover:bg-[#F5F2EF] text-[#101010] border border-[#C8C2BE] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#101010]" />
            <span>Create</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveScreen('templates')}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white hover:bg-[#F5F2EF] text-[#101010] border border-[#C8C2BE] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#101010]" />
            <span>Library</span>
          </button>
        </div>

        {/* Primary Continue Button */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
            canContinue
              ? 'bg-[#101010] hover:bg-[#252525] text-white hover:scale-[1.02]'
              : 'bg-[#C8C2BE] text-[#101010]/50 cursor-not-allowed border border-[#C8C2BE]'
          }`}
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Interactive Picker Modal */}
      {pickerSide && (
        <NidaTemplatePickerModal
          isOpen={!!pickerSide}
          targetSide={pickerSide}
          selectedTemplateId={pickerSide === 'front' ? frontTemplate?.id || null : backTemplate?.id || null}
          onClose={() => setPickerSide(null)}
          onSelectTemplate={handleSelectTemplate}
        />
      )}
    </div>
  );
};
