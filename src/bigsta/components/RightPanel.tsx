import React, { useState } from 'react';
import {
  Sliders,
  Type,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Square,
  Barcode as BarcodeIcon,
  QrCode,
  Layers,
  Ruler,
  Trash2,
  Lock,
  Brackets,
  UserCheck,
  Plus,
  Minus,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  ArrowUpDown,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Save,
  Sparkles,
  Download,
  Check,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  CheckCircle2,
  Sun,
  Image as ImageIcon,
} from 'lucide-react';
import { useTemplateStore } from '../store/useTemplateStore';
import { convertFromMm, convertToMm } from '../utils/units';
import { getTemplateValidationIssues, ValidationIssue } from '../utils/templateMappingEngine';
import {
  FONT_LIBRARY,
  FontScope,
  getAvailableWeightsForFont,
  getClosestValidWeight,
} from '../utils/fonts';
import { FontChangeModal } from './FontChangeModal';
import { WeightChangeModal } from './WeightChangeModal';

interface CollapsibleSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  badge,
  isOpen,
  onToggle,
  children,
}) => (
  <div className="border border-[#E7E9EB] rounded-xl bg-[#FFFFFF] overflow-hidden transition-all shadow-xs">
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-[#E7E9EB] transition-colors text-left select-none cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <span className="text-[#000000]">{icon}</span>
        <span className="text-xs font-bold text-[#000000]">{title}</span>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E7E9EB] text-[#000000] font-mono">
            {badge}
          </span>
        )}
      </div>
      {isOpen ? (
        <ChevronUp className="w-4 h-4 text-[#000000]" />
      ) : (
        <ChevronDown className="w-4 h-4 text-[#000000]" />
      )}
    </button>
    {isOpen && <div className="p-3 border-t border-[#E7E9EB] space-y-3">{children}</div>}
  </div>
);

interface RightPanelProps {
  isMobileDrawer?: boolean;
}

export const RightPanel: React.FC<RightPanelProps> = ({ isMobileDrawer = false }) => {
  const {
    currentTemplate,
    updateTemplateMeta,
    selectedLayerIds,
    updateLayer,
    applyFontToLayers,
    applyWeightToLayers,
    activeUnit,
    deleteSelectedLayers,
    alignSelectedLayers,
    distributeSelectedLayers,
    saveCurrentTemplate,
    setCardGeneratorOpen,
    setExportModalOpen,
    setActiveMobileSheet,
    selectLayer,
    toggleTemplateActive,
    isSaving,
  } = useTemplateStore();

  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isValidationExpanded, setIsValidationExpanded] = useState(true);

  const handleSave = async () => {
    if (isSaving) return;
    await saveCurrentTemplate();
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  const [isFontModalOpen, setIsFontModalOpen] = useState(false);
  const [pendingFont, setPendingFont] = useState('Arial Black');
  const [pendingLayerId, setPendingLayerId] = useState<string | undefined>(undefined);

  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [pendingWeight, setPendingWeight] = useState(700);
  const [pendingWeightLayerId, setPendingWeightLayerId] = useState<string | undefined>(undefined);

  // Collapsible section open states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    textProps: true,
    textAdvanced: false,
    textStroke: false,
    textShadow: false,
    positionSize: true,
    appearance: true,
    cardSettings: true,
    alignTools: true,
    multiLayers: true,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const selectedLayers = currentTemplate.layers.filter((l) => selectedLayerIds.includes(l.id));
  const selectedLayer = selectedLayers.length === 1 ? selectedLayers[0] : null;

  const handleFontSelectRequest = (font: string, targetLayerId?: string) => {
    setPendingFont(font);
    setPendingLayerId(targetLayerId);
    setIsFontModalOpen(true);
  };

  const handleApplyFont = (scope: FontScope) => {
    applyFontToLayers(pendingFont, scope, pendingLayerId);
  };

  const handleWeightSelectRequest = (weight: number, targetLayerId?: string) => {
    setPendingWeight(weight);
    setPendingWeightLayerId(targetLayerId);
    setIsWeightModalOpen(true);
  };

  const handleApplyWeight = (scope: FontScope) => {
    applyWeightToLayers(pendingWeight, scope, pendingWeightLayerId);
  };

  const variableOptions = [
    { label: 'First Name + Middle Name', val: '{{first_middle_name}}' },
    { label: 'First Name', val: '{{first_name}}' },
    { label: 'Middle Name', val: '{{middle_name}}' },
    { label: 'Last Name', val: '{{last_name}}' },
    { label: 'ID Number', val: '{{id_number}}' },
    { label: 'Date of Birth', val: '{{dob}}' },
    { label: 'Gender / Sex', val: '{{gender}}' },
    { label: 'Nationality', val: '{{nationality}}' },
    { label: 'Issue Date', val: '{{issue_date}}' },
    { label: 'Expiry Date', val: '{{expiry_date}}' },
    { label: 'Issuing Authority', val: '{{issuing_authority}}' },
    { label: 'Region / Residence', val: '{{region}}' },
    { label: 'PIN Number', val: '{{pin_number}}' },
    { label: 'Department / Role', val: '{{role}}' },
  ];

  if (!currentTemplate.side || !currentTemplate.side.toLowerCase().includes('back')) {
    variableOptions.unshift({ label: 'Front Field 9 (Categories)', val: '{{categories_field9}}' });
  }
  if (currentTemplate.side && currentTemplate.side.toLowerCase().includes('back')) {
    variableOptions.unshift({ label: 'Back Categories Table', val: '{{driving_licence_categories}}' });
  }

  // Quick actions header for Save, Generate, and Export
  const quickActionsHeader = (
    <div className="flex items-center gap-1.5 p-1.5 bg-[#E7E9EB] rounded-xl border border-[#dadcdc] shrink-0 mb-3 shadow-xs">
      <button
        onClick={handleSave}
        disabled={isSaving}
        className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 border shadow-xs ${
          isSaving 
            ? 'bg-[#E7E9EB] border-[#dadcdc] text-[#888888] cursor-not-allowed'
            : isSavedNotice
            ? 'bg-[#CEE9B9] border-[#CEE9B9] text-[#000000] font-bold cursor-pointer'
            : 'bg-[#FFFFFF] hover:bg-[#dadcdc] border-[#dadcdc] text-[#000000] cursor-pointer'
        }`}
        title="Save Template"
      >
        {isSaving ? (
          <div className="w-3.5 h-3.5 border-2 border-[#555555] border-t-transparent rounded-full animate-spin shrink-0" />
        ) : (
          <Save className="w-3.5 h-3.5 text-[#000000] shrink-0" />
        )}
        <span>{isSaving ? 'Saving...' : isSavedNotice ? 'Saved!' : 'Save'}</span>
      </button>

      <button
        onClick={() => setCardGeneratorOpen(true)}
        className="flex-1 py-1.5 px-2 bg-[#CEE9B9] hover:opacity-90 text-[#000000] text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        title="Generate Cards from CSV / Records"
      >
        <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#000000]" />
        <span>Generate</span>
      </button>

      <button
        onClick={() => setExportModalOpen(true)}
        className="flex-1 py-1.5 px-2 bg-[#ECA6FC] hover:opacity-90 text-[#000000] text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        title="Export Card as High-Res Image or Print PDF"
      >
        <Download className="w-3.5 h-3.5 shrink-0 text-[#000000]" />
        <span>Export</span>
      </button>

      {isMobileDrawer && (
        <button
          onClick={() => setActiveMobileSheet(null)}
          className="py-1.5 px-2.5 bg-[#FFFFFF] hover:bg-[#dadcdc] border border-[#dadcdc] text-[#000000] text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 shrink-0 cursor-pointer"
          title="Done - Close Editor to View Canvas"
        >
          <Check className="w-3.5 h-3.5 text-[#000000] shrink-0" />
          <span>Done</span>
        </button>
      )}
    </div>
  );

  // Helper container wrapper
  const renderPanelWrapper = (content: React.ReactNode) => {
    const validationIssues = getTemplateValidationIssues(currentTemplate);
    const errorsCount = validationIssues.filter((i) => i.type === 'error').length;

    const validationPanel = (
      <div className="border border-[#E7E9EB] rounded-xl bg-[#FFFFFF] overflow-hidden shadow-xs flex flex-col">
        {/* Header Toggle */}
        <button
          type="button"
          onClick={() => setIsValidationExpanded(!isValidationExpanded)}
          className={`w-full px-3 py-2 flex items-center justify-between transition-colors select-none cursor-pointer ${
            validationIssues.length === 0
              ? 'bg-[#F4FAF0] hover:bg-[#ebf5e6]'
              : errorsCount > 0
                ? 'bg-red-50/50 hover:bg-red-50'
                : 'bg-amber-50/50 hover:bg-amber-50'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {validationIssues.length === 0 ? (
              <ShieldAlert className="w-3.5 h-3.5 text-[#43961b] shrink-0" />
            ) : errorsCount > 0 ? (
              <ShieldAlert className="w-3.5 h-3.5 text-red-600 animate-pulse shrink-0" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
            <span className="text-[11px] font-bold text-[#000000] truncate">Integrity Guard</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
              validationIssues.length === 0
                ? 'bg-[#CEE9B9] text-[#2d5713] border border-[#b8df9c]'
                : errorsCount > 0
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              {validationIssues.length === 0 ? 'Verified' : `${validationIssues.length} alert${validationIssues.length === 1 ? '' : 's'}`}
            </span>
          </div>
          {isValidationExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#000000]/60 shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#000000]/60 shrink-0" />
          )}
        </button>

        {/* Collapsible Panel List */}
        {isValidationExpanded && (
          <div className="p-3 border-t border-[#E7E9EB] bg-white space-y-2.5">
            {validationIssues.length === 0 ? (
              <div className="text-[11px] text-[#2d5713] leading-relaxed flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#43961b] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[#1a3809] mb-0.5">Template is render-safe</span>
                  All dynamic variables match the NIDA profile. Zero injection errors detected.
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {validationIssues.map((issue, idx) => {
                  const isError = issue.type === 'error';
                  const layerObj = currentTemplate.layers.find(l => l.id === issue.layerId);
                  return (
                    <div
                      key={`${issue.layerId}_${idx}`}
                      className={`p-2 rounded-lg border text-xs flex flex-col gap-1 ${
                        isError
                          ? 'bg-red-50/20 border-red-100'
                          : 'bg-amber-50/20 border-amber-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                          {isError ? (
                            <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                          ) : (
                            <HelpCircle className="w-3 h-3 text-amber-500 shrink-0" />
                          )}
                          <span className="font-bold text-[#000000] text-[10px] truncate">
                            {issue.layerName}
                          </span>
                        </div>
                        <span className="text-[8px] font-mono uppercase bg-slate-100 text-slate-700 px-1 rounded shrink-0">
                          {issue.layerType}
                        </span>
                      </div>
                      
                      <p className="text-slate-700 leading-snug text-[10px]">
                        {issue.message}
                      </p>
                      
                      <div className="bg-white/80 border border-slate-100 p-1.5 rounded text-[9px] text-slate-600 space-y-1.5">
                        <span className="block leading-tight text-[9px] font-medium text-slate-500">💡 {issue.suggestedFix}</span>
                        
                        <div className="flex gap-1.5 flex-wrap pt-0.5">
                          <button
                            type="button"
                            onClick={() => selectLayer(issue.layerId)}
                            className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-[#000000] rounded text-[8px] font-bold transition-colors cursor-pointer"
                          >
                            Edit Layer
                          </button>
                          
                          {issue.suggestedReplacement && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!layerObj) return;
                                if (layerObj.type === 'text') {
                                  const textLayer = layerObj as any;
                                  const oldText = textLayer.text || '';
                                  const newText = oldText.replace(issue.variable, issue.suggestedReplacement!);
                                  updateLayer(layerObj.id, { text: newText });
                                } else if (layerObj.type === 'barcode' || layerObj.type === 'qrcode') {
                                  updateLayer(layerObj.id, { data: issue.suggestedReplacement });
                                }
                              }}
                              className="px-1.5 py-0.5 bg-[#CEE9B9] hover:opacity-90 text-[#000000] rounded text-[8px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer border border-[#b8df9c]"
                            >
                              <Sparkles className="w-2.5 h-2.5 shrink-0 text-slate-800" />
                              Apply: {issue.suggestedReplacement}
                            </button>
                          )}
                          
                          {!issue.suggestedReplacement && (issue.layerType === 'placeholder' || issue.layerType === 'image') && (
                            <button
                              type="button"
                              onClick={() => {
                                updateLayer(issue.layerId, { name: `Cardholder ${issue.variable === 'PHOTO' ? 'Photo' : 'Signature'}` });
                              }}
                              className="px-1.5 py-0.5 bg-[#CEE9B9] hover:opacity-90 text-[#000000] rounded text-[8px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer border border-[#b8df9c]"
                            >
                              <Sparkles className="w-2.5 h-2.5 shrink-0 text-slate-800" />
                              Auto-Bind {issue.variable}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );

    if (isMobileDrawer) {
      return (
        <div className="space-y-3 pb-6 bg-[#FFFFFF]">
          {quickActionsHeader}
          {content}
          <div className="pt-2">{validationPanel}</div>
          <FontChangeModal
            isOpen={isFontModalOpen}
            pendingFont={pendingFont}
            onClose={() => setIsFontModalOpen(false)}
            onApply={handleApplyFont}
            selectedLayerName={selectedLayer?.name || (selectedLayer as any)?.text}
            textLayers={currentTemplate.layers.filter((l) => l.type === 'text')}
          />
          <WeightChangeModal
            isOpen={isWeightModalOpen}
            pendingWeight={pendingWeight}
            onClose={() => setIsWeightModalOpen(false)}
            onApply={handleApplyWeight}
            selectedLayerName={selectedLayer?.name || (selectedLayer as any)?.text}
            textLayers={currentTemplate.layers.filter((l) => l.type === 'text')}
          />
        </div>
      );
    }

    return (
      <aside className="hidden lg:flex lg:w-80 bg-[#FFFFFF] border-l border-[#E7E9EB] p-3.5 flex-col h-[calc(100vh-3.5rem)] select-none text-[#000000] shrink-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-3 pb-3 pr-1">
          {quickActionsHeader}
          {content}
        </div>
        
        {/* Validation Panel anchored at bottom */}
        <div className="shrink-0 border-t border-[#E7E9EB] pt-3 bg-white">
          {validationPanel}
        </div>

        <FontChangeModal
          isOpen={isFontModalOpen}
          pendingFont={pendingFont}
          onClose={() => setIsFontModalOpen(false)}
          onApply={handleApplyFont}
          selectedLayerName={selectedLayer?.name || (selectedLayer as any)?.text}
          textLayers={currentTemplate.layers.filter((l) => l.type === 'text')}
        />
        <WeightChangeModal
          isOpen={isWeightModalOpen}
          pendingWeight={pendingWeight}
          onClose={() => setIsWeightModalOpen(false)}
          onApply={handleApplyWeight}
          selectedLayerName={selectedLayer?.name || (selectedLayer as any)?.text}
          textLayers={currentTemplate.layers.filter((l) => l.type === 'text')}
        />
      </aside>
    );
  };

  // Case 1: No Layer Selected -> Card Settings & Global Replacers
  if (selectedLayers.length === 0) {
    const cardContent = (
      <>
        <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9EB] font-bold text-xs uppercase text-[#000000] tracking-wider">
          <Sliders className="w-4 h-4 text-[#000000]" />
          <span>Card Settings & Global Font</span>
        </div>

        <div className="mt-3 space-y-3 text-xs">
          {/* Collapsible Card Dimensions & Color */}
          <CollapsibleSection
            id="cardSettings"
            title="Card Canvas & Dimensions"
            icon={<Square className="w-3.5 h-3.5 text-[#000000]" />}
            badge={`${currentTemplate.cardWidth} × ${currentTemplate.cardHeight} mm`}
            isOpen={openSections.cardSettings}
            onToggle={() => toggleSection('cardSettings')}
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[#000000] font-semibold mb-1 text-[11px]">
                  Card Width (mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={currentTemplate.cardWidth}
                  onChange={(e) =>
                    updateTemplateMeta({ cardWidth: parseFloat(e.target.value) || 85.6 })
                  }
                  className="w-full px-2.5 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded-lg text-[#000000] font-mono text-xs focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div>
                <label className="block text-[#000000] font-semibold mb-1 text-[11px]">
                  Card Height (mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={currentTemplate.cardHeight}
                  onChange={(e) =>
                    updateTemplateMeta({ cardHeight: parseFloat(e.target.value) || 53.98 })
                  }
                  className="w-full px-2.5 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded-lg text-[#000000] font-mono text-xs focus:outline-none focus:border-[#000000]"
                />
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-[#000000] font-semibold mb-1 text-[11px]">
                Canvas Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentTemplate.background?.color || '#ffffff'}
                  onChange={(e) =>
                    updateTemplateMeta({
                      background: {
                        ...currentTemplate.background,
                        type: 'color',
                        color: e.target.value,
                      },
                    })
                  }
                  className="w-8 h-8 rounded-lg border border-[#dadcdc] cursor-pointer bg-transparent"
                />
                <span className="font-mono text-[#000000] text-xs uppercase font-bold">
                  {currentTemplate.background?.color || '#ffffff'}
                </span>
              </div>
            </div>

            {/* Active Status Control (PROMPT 50.4) */}
            <div className="pt-2 border-t border-[#E7E9EB] mt-2">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex flex-col">
                  <span className="text-[#000000] font-bold text-[11px] group-hover:text-blue-700 transition-colors">
                    Template Active Status
                  </span>
                  <span className="text-[9px] text-[#555555]">
                    {currentTemplate.isActive ? 'Visible to users for generation' : 'Hidden from user generation engine'}
                  </span>
                </div>
                <div 
                  onClick={() => toggleTemplateActive(currentTemplate.id, !currentTemplate.isActive)}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 ${
                    currentTemplate.isActive ? 'bg-blue-600 shadow-sm shadow-blue-600/30' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 ${
                      currentTemplate.isActive ? 'translate-x-5.5' : 'translate-x-1'
                    }`}
                  />
                </div>
              </label>
              <div className="mt-2 p-1.5 bg-amber-50 border border-amber-100 rounded-md">
                <p className="text-[9px] text-amber-800 leading-tight">
                  <AlertTriangle className="w-2.5 h-2.5 inline-block mr-1 -mt-0.5" />
                  <strong>Rule:</strong> Activating this will automatically deactivate any previous active 
                  {currentTemplate.side?.toLowerCase().includes('back') ? ' BACK ' : ' FRONT '} 
                  template for <strong>{currentTemplate.serviceId?.toUpperCase()}</strong>.
                </p>
              </div>
            </div>
          </CollapsibleSection>

          {/* Template Font Replacer */}
          <CollapsibleSection
            id="templateFont"
            title="Batch Font & Boldness"
            icon={<Type className="w-3.5 h-3.5 text-[#000000]" />}
            badge={`${currentTemplate.layers.filter((l) => l.type === 'text').length} text layers`}
            isOpen={true}
            onToggle={() => {}}
          >
            <p className="text-[11px] text-[#444444] leading-snug">
              Batch update all text objects (First Name, Last Name, ID Number, DOB, Labels) to any
              font family or weight in one action.
            </p>

            <div>
              <label className="block text-[#000000] font-semibold mb-1 text-[11px]">
                Change Template Font Family
              </label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleFontSelectRequest(e.target.value, undefined);
                    e.target.value = '';
                  }
                }}
                className="w-full px-2.5 py-2 bg-[#E7E9EB] border border-[#dadcdc] rounded-lg text-xs font-semibold text-[#000000] cursor-pointer focus:outline-none focus:border-[#000000]"
              >
                <option value="" disabled>
                  Select Template Font...
                </option>
                {FONT_LIBRARY.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#000000] font-semibold mb-1 text-[11px]">
                Change Template Font Weight
              </label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const weightVal = parseInt(e.target.value, 10);
                    if (!isNaN(weightVal)) {
                      handleWeightSelectRequest(weightVal, undefined);
                    }
                    e.target.value = '';
                  }
                }}
                className="w-full px-2.5 py-2 bg-[#E7E9EB] border border-[#dadcdc] rounded-lg text-xs font-semibold text-[#000000] cursor-pointer focus:outline-none focus:border-[#000000]"
              >
                <option value="" disabled>
                  Select Template Weight...
                </option>
                <option value="300">Light (300)</option>
                <option value="400">Regular (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semi Bold (600)</option>
                <option value="700">Bold (700)</option>
                <option value="800">Extra Bold (800)</option>
                <option value="900">Black (900)</option>
              </select>
            </div>
          </CollapsibleSection>
        </div>
      </>
    );
    return renderPanelWrapper(cardContent);
  }

  // Case 2: Multiple Layers Selected
  if (selectedLayers.length > 1) {
    const multiContent = (
      <>
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E9EB]">
          <div className="flex items-center gap-2 font-bold text-xs uppercase text-[#000000] tracking-wider">
            <Layers className="w-4 h-4 text-[#000000]" />
            <span>Multiple Layers ({selectedLayers.length})</span>
          </div>
          <button
            onClick={deleteSelectedLayers}
            className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors cursor-pointer"
            title="Delete Selected Layers"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 space-y-3 text-xs">
          {/* Alignment Tools */}
          <CollapsibleSection
            id="multiAlign"
            title="Align Selection"
            icon={<AlignStartVertical className="w-3.5 h-3.5 text-[#000000]" />}
            isOpen={openSections.alignTools}
            onToggle={() => toggleSection('alignTools')}
          >
            <div className="grid grid-cols-3 gap-1 bg-[#E7E9EB] p-1.5 rounded-lg border border-[#dadcdc]">
              <button
                onClick={() => alignSelectedLayers('left')}
                className="p-2 hover:bg-[#dadcdc] rounded flex flex-col items-center gap-1 text-[#000000] cursor-pointer"
                title="Align Left"
              >
                <AlignStartVertical className="w-4 h-4" />
                <span className="text-[9px]">Left</span>
              </button>
              <button
                onClick={() => alignSelectedLayers('center')}
                className="p-2 hover:bg-[#dadcdc] rounded flex flex-col items-center gap-1 text-[#000000] cursor-pointer"
                title="Align Center"
              >
                <AlignCenterVertical className="w-4 h-4" />
                <span className="text-[9px]">Center</span>
              </button>
              <button
                onClick={() => alignSelectedLayers('right')}
                className="p-2 hover:bg-[#dadcdc] rounded flex flex-col items-center gap-1 text-[#000000] cursor-pointer"
                title="Align Right"
              >
                <AlignEndVertical className="w-4 h-4" />
                <span className="text-[9px]">Right</span>
              </button>

              <button
                onClick={() => alignSelectedLayers('top')}
                className="p-2 hover:bg-[#dadcdc] rounded flex flex-col items-center gap-1 text-[#000000] cursor-pointer"
                title="Align Top"
              >
                <AlignStartHorizontal className="w-4 h-4" />
                <span className="text-[9px]">Top</span>
              </button>
              <button
                onClick={() => alignSelectedLayers('middle')}
                className="p-2 hover:bg-[#dadcdc] rounded flex flex-col items-center gap-1 text-[#000000] cursor-pointer"
                title="Align Middle"
              >
                <AlignCenterHorizontal className="w-4 h-4" />
                <span className="text-[9px]">Middle</span>
              </button>
              <button
                onClick={() => alignSelectedLayers('bottom')}
                className="p-2 hover:bg-[#dadcdc] rounded flex flex-col items-center gap-1 text-[#000000] cursor-pointer"
                title="Align Bottom"
              >
                <AlignEndHorizontal className="w-4 h-4" />
                <span className="text-[9px]">Bottom</span>
              </button>
            </div>
          </CollapsibleSection>

          {/* Equal Spacing */}
          <CollapsibleSection
            id="multiSpacing"
            title="Distribute & Spacing"
            icon={<ArrowLeftRight className="w-3.5 h-3.5 text-[#000000]" />}
            isOpen={true}
            onToggle={() => {}}
          >
            <div className="grid grid-cols-2 gap-1.5 bg-[#E7E9EB] p-1.5 rounded-lg border border-[#dadcdc]">
              <button
                onClick={() => distributeSelectedLayers('horizontal')}
                className="p-2 hover:bg-[#dadcdc] rounded flex items-center justify-center gap-2 text-[#000000] cursor-pointer"
                title="Equal Horizontal Spacing"
              >
                <ArrowLeftRight className="w-4 h-4 text-[#000000]" />
                <span className="text-[10px] font-medium">Horizontal</span>
              </button>
              <button
                onClick={() => distributeSelectedLayers('vertical')}
                className="p-2 hover:bg-[#dadcdc] rounded flex items-center justify-center gap-2 text-[#000000] cursor-pointer"
                title="Equal Vertical Spacing"
              >
                <ArrowUpDown className="w-4 h-4 text-[#000000]" />
                <span className="text-[10px] font-medium">Vertical</span>
              </button>
            </div>
          </CollapsibleSection>
        </div>
      </>
    );
    return renderPanelWrapper(multiContent);
  }

  // Case 3: Single Layer Selected
  if (!selectedLayer) return null;

  // Geometry conversions
  const xDisplay = Number(convertFromMm(selectedLayer.x, activeUnit).toFixed(2));
  const yDisplay = Number(convertFromMm(selectedLayer.y, activeUnit).toFixed(2));
  const wDisplay = Number(convertFromMm(selectedLayer.width, activeUnit).toFixed(2));
  const hDisplay = Number(convertFromMm(selectedLayer.height, activeUnit).toFixed(2));

  const stepSize =
    activeUnit === 'mm' ? 0.5 : activeUnit === 'cm' ? 0.05 : activeUnit === 'in' ? 0.02 : 2;

  const handlePositionChange = (field: 'x' | 'y' | 'width' | 'height', val: number) => {
    const valInMm = convertToMm(val, activeUnit);
    updateLayer(selectedLayer.id, { [field]: Math.max(0.1, valInMm) });
  };

  const singleContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E7E9EB] shrink-0">
        <div className="flex items-center gap-2 font-bold text-xs uppercase text-[#000000] tracking-wider truncate">
          <Sliders className="w-4 h-4 text-[#000000] shrink-0" />
          <span className="truncate">{selectedLayer.name}</span>
        </div>
        <button
          onClick={deleteSelectedLayers}
          className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors cursor-pointer"
          title="Delete Layer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 space-y-3 text-xs">
        {/* Layer Title Input */}
        <div>
          <label className="block text-[#000000] font-semibold mb-1 text-[11px]">Layer Title</label>
          <input
            type="text"
            value={selectedLayer.name}
            onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded-lg text-[#000000] text-xs focus:outline-none focus:border-[#000000]"
          />
        </div>

        {/* 1. COMPACT UNIFIED TEXT PROPERTIES SECTION (User requirement) */}
        {selectedLayer.type === 'text' && (
          <CollapsibleSection
            id="textProps"
            title="Text Appearance"
            icon={<Type className="w-3.5 h-3.5 text-[#000000]" />}
            badge={selectedLayer.fontFamily || 'Helvetica'}
            isOpen={openSections.textProps}
            onToggle={() => toggleSection('textProps')}
          >
            {/* Quick Variable Picker & Text Content */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#000000]">Content / Variable</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      const valToInsert = e.target.value;
                      const updatedText = selectedLayer.text ? selectedLayer.text + ' ' + valToInsert : valToInsert;
                      let newBinding = (selectedLayer as any).bindingKey;
                      if (valToInsert.includes('first_middle_name')) {
                        newBinding = 'FIRST_MIDDLE_NAME';
                      } else if (valToInsert.includes('first_name')) {
                        newBinding = 'FIRST_NAME';
                      } else if (valToInsert.includes('middle_name')) {
                        newBinding = 'MIDDLE_NAME';
                      } else if (valToInsert.includes('last_name')) {
                        newBinding = 'LAST_NAME';
                      }
                      updateLayer(selectedLayer.id, {
                        text: updatedText,
                        bindingKey: newBinding || (selectedLayer as any).bindingKey,
                      });
                      e.target.value = '';
                    }
                  }}
                  className="px-2 py-0.5 bg-[#E7E9EB] border border-[#dadcdc] rounded text-[11px] text-[#000000] font-semibold cursor-pointer"
                >
                  <option value="">+ Insert Variable...</option>
                  {variableOptions.map((v) => (
                    <option key={v.val} value={v.val}>
                      {v.label} ({v.val})
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                rows={2}
                value={selectedLayer.text}
                onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded-lg text-[#000000] font-mono text-xs focus:outline-none focus:border-[#000000]"
              />
            </div>

            {/* Driving License Properties */}
            {currentTemplate.cardType === 'Driving License' && (
              <div className="border-t border-[#dadcdc] pt-3 mt-3 space-y-3">
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#555] block">
                  DRIVING LICENCE CUSTOM SETTINGS
                </span>

                {/* Group Category Date Properties */}
                <div className="space-y-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      id="is-group-date-checkbox"
                      checked={(selectedLayer as any).licenseCategoryGroup !== undefined}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateLayer(selectedLayer.id, {
                            licenseCategoryGroup: 'A',
                            licenseCategoryDateType: 'issueDate',
                            licenseCategoriesSeparator: undefined,
                            text: '12/05/2026',
                          });
                        } else {
                          updateLayer(selectedLayer.id, {
                            licenseCategoryGroup: undefined,
                            licenseCategoryDateType: undefined,
                          });
                        }
                      }}
                      className="rounded border-[#dadcdc] text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="is-group-date-checkbox" className="text-xs font-bold text-[#000000] cursor-pointer">
                      Is Category Group Date
                    </label>
                  </div>

                  {(selectedLayer as any).licenseCategoryGroup !== undefined && (
                    <div className="grid grid-cols-2 gap-2 pl-5 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#000000] mb-1">
                          Group
                        </label>
                        <select
                          value={(selectedLayer as any).licenseCategoryGroup || 'A'}
                          onChange={(e) => updateLayer(selectedLayer.id, { licenseCategoryGroup: e.target.value })}
                          className="w-full px-2 py-1 bg-[#E7E9EB] border border-[#dadcdc] rounded text-xs text-[#000000] font-semibold focus:outline-none focus:border-[#000000]"
                        >
                          {['A', 'A1', 'A2', 'A3', 'B', 'C', 'C1', 'C2', 'C3', 'D', 'E', 'F', 'G'].map((grp) => (
                            <option key={grp} value={grp}>{grp}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#000000] mb-1">
                          Date Type
                        </label>
                        <select
                          value={(selectedLayer as any).licenseCategoryDateType || 'issueDate'}
                          onChange={(e) => updateLayer(selectedLayer.id, { licenseCategoryDateType: e.target.value as any })}
                          className="w-full px-2 py-1 bg-[#E7E9EB] border border-[#dadcdc] rounded text-xs text-[#000000] font-semibold focus:outline-none focus:border-[#000000]"
                        >
                          <option value="issueDate">Issue Date</option>
                          <option value="expiryDate">Expiry Date</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Licence Categories Properties */}
                <div className="space-y-2 p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      id="is-categories-checkbox"
                      checked={(selectedLayer as any).licenseCategoriesSeparator !== undefined}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateLayer(selectedLayer.id, {
                            licenseCategoriesSeparator: 'spaceSeparated',
                            licenseCategoryGroup: undefined,
                            licenseCategoryDateType: undefined,
                            text: 'A B D E G',
                          });
                        } else {
                          updateLayer(selectedLayer.id, {
                            licenseCategoriesSeparator: undefined,
                          });
                        }
                      }}
                      className="rounded border-[#dadcdc] text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="is-categories-checkbox" className="text-xs font-bold text-[#000000] cursor-pointer">
                      Is Licence Categories List
                    </label>
                  </div>

                  {(selectedLayer as any).licenseCategoriesSeparator !== undefined && (
                    <div className="pl-5 pt-1">
                      <label className="block text-[11px] font-semibold text-[#000000] mb-1">
                        Separator Style
                      </label>
                      <select
                        value={(selectedLayer as any).licenseCategoriesSeparator || 'spaceSeparated'}
                        onChange={(e) => updateLayer(selectedLayer.id, { licenseCategoriesSeparator: e.target.value as any })}
                        className="w-full px-2 py-1 bg-[#E7E9EB] border border-[#dadcdc] rounded text-xs text-[#000000] font-semibold focus:outline-none focus:border-[#000000]"
                      >
                        <option value="spaceSeparated">Space Separated (e.g. A B D E G)</option>
                        <option value="commaSeparated">Comma Separated (e.g. A, B, D, E, G)</option>
                        <option value="slashSeparated">Slash Separated (e.g. A/B/D/E/G)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FONT SUBSECTION */}
            <div className="border-t border-[#dadcdc] pt-3 mt-3">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#555] block mb-2">FONT</span>
              <div className="space-y-2.5">
                {/* Font Family & Font Size */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#000000] font-semibold mb-1 text-[11px]">
                      Font Family
                    </label>
                    <select
                      value={selectedLayer.fontFamily || 'Helvetica'}
                      onChange={(e) => handleFontSelectRequest(e.target.value, selectedLayer.id)}
                      className="w-full px-2 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded-lg text-xs cursor-pointer text-[#000000] font-semibold focus:outline-none focus:border-[#000000]"
                    >
                      {FONT_LIBRARY.map((f) => (
                        <option key={f} value={f} style={{ fontFamily: f }}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#000000] font-semibold mb-1 text-[11px]">
                      Size ({activeUnit})
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateLayer(selectedLayer.id, {
                            fontSize: Math.max(1, selectedLayer.fontSize - 0.2),
                          })
                        }
                        className="px-1.5 py-1 bg-[#E7E9EB] hover:bg-[#dadcdc] border border-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        step="0.2"
                        value={selectedLayer.fontSize}
                        onChange={(e) =>
                          updateLayer(selectedLayer.id, {
                            fontSize: parseFloat(e.target.value) || 2,
                          })
                        }
                        className="w-full px-1 py-1 bg-[#E7E9EB] border border-[#dadcdc] rounded font-mono text-xs text-center text-[#000000] focus:outline-none focus:border-[#000000]"
                      />
                      <button
                        onClick={() =>
                          updateLayer(selectedLayer.id, {
                            fontSize: selectedLayer.fontSize + 0.2,
                          })
                        }
                        className="px-1.5 py-1 bg-[#E7E9EB] hover:bg-[#dadcdc] border border-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Font Weight Control */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#000000] font-semibold text-[11px]">
                      Font Weight
                    </label>
                    <span className="text-[10px] text-[#000000] font-mono font-bold">
                      {selectedLayer.fontWeight ?? (selectedLayer.fontStyle?.includes('bold') ? 700 : 400)}
                    </span>
                  </div>
                  <select
                    value={getClosestValidWeight(
                      selectedLayer.fontFamily || 'Helvetica',
                      selectedLayer.fontWeight ?? (selectedLayer.fontStyle?.includes('bold') ? 700 : 400)
                    )}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        handleWeightSelectRequest(val, selectedLayer.id);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded-lg text-xs cursor-pointer text-[#000000] font-semibold focus:outline-none focus:border-[#000000]"
                  >
                    {getAvailableWeightsForFont(selectedLayer.fontFamily || 'Helvetica').map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color & Quick Formatting & Alignment */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {/* Color Picker with hex display */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={selectedLayer.color || '#000000'}
                      onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                      className="w-7 h-7 rounded border border-[#dadcdc] cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-[10px] text-[#000000] font-bold uppercase">
                      {selectedLayer.color || '#000000'}
                    </span>
                  </div>

                  {/* Quick Bold (B), Italic (I), Underline (U) */}
                  <div className="flex items-center bg-[#E7E9EB] rounded-lg p-0.5 border border-[#dadcdc]">
                    <button
                      onClick={() => {
                        const availableWeights = getAvailableWeightsForFont(
                          selectedLayer.fontFamily || 'Helvetica'
                        );
                        const currentWeight =
                          selectedLayer.fontWeight ??
                          (selectedLayer.fontStyle?.includes('bold') ? 700 : 400);
                        const isBoldNow = currentWeight >= 600;

                        let targetWeight: number;
                        if (isBoldNow) {
                          const minWeight = Math.min(...availableWeights.map((w) => w.value));
                          targetWeight = availableWeights.some((w) => w.value === 400)
                            ? 400
                            : minWeight;
                        } else {
                          const maxWeight = Math.max(...availableWeights.map((w) => w.value));
                          targetWeight = availableWeights.some((w) => w.value === 700)
                            ? 700
                            : maxWeight;
                        }

                        const isItalic = selectedLayer.fontStyle?.includes('italic');
                        const newIsBold = targetWeight >= 600;
                        let newStyle = 'normal';
                        if (newIsBold && isItalic) newStyle = 'bold italic';
                        else if (newIsBold) newStyle = 'bold';
                        else if (isItalic) newStyle = 'italic';

                        updateLayer(selectedLayer.id, {
                          fontWeight: targetWeight,
                          fontStyle: newStyle,
                        });
                      }}
                      title="Quick Bold Toggle"
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        (selectedLayer.fontWeight ??
                          (selectedLayer.fontStyle?.includes('bold') ? 700 : 400)) >= 600
                          ? 'bg-[#000000] text-[#FFFFFF] font-bold'
                          : 'text-[#000000] hover:bg-[#dadcdc]'
                      }`}
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        const isItalic = selectedLayer.fontStyle?.includes('italic');
                        const isBold =
                          selectedLayer.fontStyle?.includes('bold') ||
                          (selectedLayer.fontWeight ?? 400) >= 600;
                        let newStyle = 'normal';
                        if (isBold && !isItalic) newStyle = 'bold italic';
                        else if (!isBold && !isItalic) newStyle = 'italic';
                        else if (isBold && isItalic) newStyle = 'bold';
                        updateLayer(selectedLayer.id, { fontStyle: newStyle });
                      }}
                      title="Italic"
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        selectedLayer.fontStyle?.includes('italic')
                          ? 'bg-[#000000] text-[#FFFFFF]'
                          : 'text-[#000000] hover:bg-[#dadcdc]'
                      }`}
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() =>
                        updateLayer(selectedLayer.id, {
                          textDecoration:
                            selectedLayer.textDecoration === 'underline' ? 'none' : 'underline',
                        })
                      }
                      title="Underline"
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        selectedLayer.textDecoration === 'underline'
                          ? 'bg-[#000000] text-[#FFFFFF]'
                          : 'text-[#000000] hover:bg-[#dadcdc]'
                      }`}
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Text Alignment */}
                  <div className="flex items-center bg-[#E7E9EB] rounded-lg p-0.5 border border-[#dadcdc]">
                    <button
                      onClick={() => updateLayer(selectedLayer.id, { align: 'left' })}
                      className={`p-1.5 rounded cursor-pointer ${
                        selectedLayer.align === 'left'
                          ? 'bg-[#000000] text-[#FFFFFF]'
                          : 'text-[#000000] hover:bg-[#dadcdc]'
                      }`}
                      title="Left"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateLayer(selectedLayer.id, { align: 'center' })}
                      className={`p-1.5 rounded cursor-pointer ${
                        selectedLayer.align === 'center'
                          ? 'bg-[#000000] text-[#FFFFFF]'
                          : 'text-[#000000] hover:bg-[#dadcdc]'
                      }`}
                      title="Center"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateLayer(selectedLayer.id, { align: 'right' })}
                      className={`p-1.5 rounded cursor-pointer ${
                        selectedLayer.align === 'right'
                          ? 'bg-[#000000] text-[#FFFFFF]'
                          : 'text-[#000000] hover:bg-[#dadcdc]'
                      }`}
                      title="Right"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* TRANSFORM SUBSECTION */}
            <div className="border-t border-[#dadcdc] pt-3 mt-3">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#555] block mb-2">TRANSFORM</span>
              <div className="space-y-3.5">
                {/* Width Preset Selector */}
                <div className="space-y-1">
                  <label className="block text-[#000000] font-semibold text-[11px]">
                    Condensed / Expanded Width Preset
                  </label>
                  <select
                    value={(selectedLayer as any).widthPreset || 'normal'}
                    onChange={(e) => updateLayer(selectedLayer.id, { widthPreset: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded-lg text-xs cursor-pointer text-[#000000] font-semibold focus:outline-none focus:border-[#000000]"
                  >
                    <option value="condensed">Condensed (75%)</option>
                    <option value="semi_condensed">Semi-Condensed (85%)</option>
                    <option value="normal">Normal (100%)</option>
                    <option value="semi_expanded">Semi-Expanded (115%)</option>
                    <option value="expanded">Expanded (125%)</option>
                  </select>
                </div>

                {/* Vertical Scale */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#000000]">Vertical Scale</span>
                    <span className="text-[10px] font-mono text-[#000000] font-bold">{((selectedLayer as any).verticalScale ?? 1).toFixed(1)}x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={(selectedLayer as any).verticalScale ?? 1}
                      onChange={(e) => updateLayer(selectedLayer.id, { verticalScale: parseFloat(e.target.value) || 1 })}
                      className="flex-1 accent-[#000000] cursor-pointer"
                    />
                    <div className="flex items-center gap-0.5 border border-[#dadcdc] rounded-lg bg-[#E7E9EB] p-0.5">
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { verticalScale: Math.max(0.5, parseFloat((((selectedLayer as any).verticalScale ?? 1) - 0.1).toFixed(1))) })}
                        className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        value={parseFloat(((selectedLayer as any).verticalScale ?? 1).toFixed(1))}
                        onChange={(e) => updateLayer(selectedLayer.id, { verticalScale: parseFloat(e.target.value) || 1 })}
                        className="w-10 bg-transparent text-center text-[11px] font-mono font-bold text-[#000000] focus:outline-none"
                      />
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { verticalScale: Math.min(3, parseFloat((((selectedLayer as any).verticalScale ?? 1) + 0.1).toFixed(1))) })}
                        className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Horizontal Scale */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#000000]">Horizontal Scale</span>
                    <span className="text-[10px] font-mono text-[#000000] font-bold">{((selectedLayer as any).horizontalScale ?? 1).toFixed(1)}x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={(selectedLayer as any).horizontalScale ?? 1}
                      onChange={(e) => updateLayer(selectedLayer.id, { horizontalScale: parseFloat(e.target.value) || 1 })}
                      className="flex-1 accent-[#000000] cursor-pointer"
                    />
                    <div className="flex items-center gap-0.5 border border-[#dadcdc] rounded-lg bg-[#E7E9EB] p-0.5">
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { horizontalScale: Math.max(0.5, parseFloat((((selectedLayer as any).horizontalScale ?? 1) - 0.1).toFixed(1))) })}
                        className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        value={parseFloat(((selectedLayer as any).horizontalScale ?? 1).toFixed(1))}
                        onChange={(e) => updateLayer(selectedLayer.id, { horizontalScale: parseFloat(e.target.value) || 1 })}
                        className="w-10 bg-transparent text-center text-[11px] font-mono font-bold text-[#000000] focus:outline-none"
                      />
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { horizontalScale: Math.min(3, parseFloat((((selectedLayer as any).horizontalScale ?? 1) + 0.1).toFixed(1))) })}
                        className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SPACING SUBSECTION */}
            <div className="border-t border-[#dadcdc] pt-3 mt-3">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#555] block mb-2">SPACING</span>
              <div className="space-y-3.5">
                {/* Letter Spacing */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#000000]">Letter Spacing (mm)</span>
                    <span className="text-[10px] font-mono text-[#000000] font-bold">{((selectedLayer as any).letterSpacing || 0).toFixed(2)} mm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="-2"
                      max="10"
                      step="0.1"
                      value={(selectedLayer as any).letterSpacing || 0}
                      onChange={(e) => updateLayer(selectedLayer.id, { letterSpacing: parseFloat(e.target.value) || 0 })}
                      className="flex-1 accent-[#000000] cursor-pointer"
                    />
                    <div className="flex items-center gap-0.5 border border-[#dadcdc] rounded-lg bg-[#E7E9EB] p-0.5">
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { letterSpacing: Math.max(-2, parseFloat((((selectedLayer as any).letterSpacing || 0) - 0.1).toFixed(2))) })}
                        className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        value={parseFloat(((selectedLayer as any).letterSpacing || 0).toFixed(2))}
                        onChange={(e) => updateLayer(selectedLayer.id, { letterSpacing: parseFloat(e.target.value) || 0 })}
                        className="w-10 bg-transparent text-center text-[11px] font-mono font-bold text-[#000000] focus:outline-none"
                      />
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { letterSpacing: Math.min(10, parseFloat((((selectedLayer as any).letterSpacing || 0) + 0.1).toFixed(2))) })}
                        className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Word Spacing */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#000000]">Word Spacing (mm)</span>
                    <span className="text-[10px] font-mono text-[#000000] font-bold">{((selectedLayer as any).wordSpacing || 0).toFixed(2)} mm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="-2"
                      max="15"
                      step="0.1"
                      value={(selectedLayer as any).wordSpacing || 0}
                      onChange={(e) => updateLayer(selectedLayer.id, { wordSpacing: parseFloat(e.target.value) || 0 })}
                      className="flex-1 accent-[#000000] cursor-pointer"
                    />
                    <div className="flex items-center gap-0.5 border border-[#dadcdc] rounded-lg bg-[#E7E9EB] p-0.5">
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { wordSpacing: Math.max(-2, parseFloat((((selectedLayer as any).wordSpacing || 0) - 0.1).toFixed(2))) })}
                        className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        value={parseFloat(((selectedLayer as any).wordSpacing || 0).toFixed(2))}
                        onChange={(e) => updateLayer(selectedLayer.id, { wordSpacing: parseFloat(e.target.value) || 0 })}
                        className="w-10 bg-transparent text-center text-[11px] font-mono font-bold text-[#000000] focus:outline-none"
                      />
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { wordSpacing: Math.min(15, parseFloat((((selectedLayer as any).wordSpacing || 0) + 0.1).toFixed(2))) })}
                        className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Line Height */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#000000]">Line Height</span>
                    <span className="text-[10px] font-mono text-[#000000] font-bold">{((selectedLayer as any).lineHeight || 1.1).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={(selectedLayer as any).lineHeight || 1.1}
                      onChange={(e) => updateLayer(selectedLayer.id, { lineHeight: parseFloat(e.target.value) || 1.1 })}
                      className="flex-1 accent-[#000000] cursor-pointer"
                    />
                    <div className="flex items-center gap-0.5 border border-[#dadcdc] rounded-lg bg-[#E7E9EB] p-0.5">
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { lineHeight: Math.max(0.5, parseFloat((((selectedLayer as any).lineHeight || 1.1) - 0.1).toFixed(2))) })}
                        className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        value={parseFloat(((selectedLayer as any).lineHeight || 1.1).toFixed(2))}
                        onChange={(e) => updateLayer(selectedLayer.id, { lineHeight: parseFloat(e.target.value) || 1.1 })}
                        className="w-10 bg-transparent text-center text-[11px] font-mono font-bold text-[#000000] focus:outline-none"
                      />
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { lineHeight: Math.min(3, parseFloat((((selectedLayer as any).lineHeight || 1.1) + 0.1).toFixed(2))) })}
                        className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STYLE SUBSECTION */}
            <div className="border-t border-[#dadcdc] pt-3 mt-3">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#555] block mb-2">STYLE</span>
              <div className="space-y-4">
                {/* Text Case Control */}
                <div className="space-y-1">
                  <label className="block text-[#000000] font-semibold text-[11px]">Text Case</label>
                  <select
                    value={(selectedLayer as any).textCase || 'original'}
                    onChange={(e) => updateLayer(selectedLayer.id, { textCase: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded-lg text-xs cursor-pointer text-[#000000] font-semibold focus:outline-none focus:border-[#000000]"
                  >
                    <option value="original">Original</option>
                    <option value="uppercase">UPPERCASE</option>
                    <option value="lowercase">lowercase</option>
                    <option value="capitalize">Capitalize</option>
                  </select>
                </div>

                {/* Bold Simulation */}
                <div className="space-y-1">
                  <label className="block text-[#000000] font-semibold text-[11px]">Bold Simulation Option</label>
                  <select
                    value={(selectedLayer as any).boldSimulation || 'normal'}
                    onChange={(e) => updateLayer(selectedLayer.id, { boldSimulation: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded-lg text-xs cursor-pointer text-[#000000] font-semibold focus:outline-none focus:border-[#000000]"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold (Prefers Real Bold Font)</option>
                    <option value="simulated_bold">Simulated Bold</option>
                  </select>
                </div>

                {/* Opacity */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#000000]">Opacity</span>
                    <span className="text-[10px] font-mono text-[#000000] font-bold">{Math.round(((selectedLayer as any).textOpacity ?? 1) * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={(selectedLayer as any).textOpacity ?? 1}
                      onChange={(e) => updateLayer(selectedLayer.id, { textOpacity: parseFloat(e.target.value) })}
                      className="flex-1 accent-[#000000] cursor-pointer"
                    />
                    <div className="flex items-center gap-0.5 border border-[#dadcdc] rounded-lg bg-[#E7E9EB] p-0.5">
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { textOpacity: Math.max(0, parseFloat((((selectedLayer as any).textOpacity ?? 1) - 0.05).toFixed(2))) })}
                        className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <input
                        type="number"
                        step="5"
                        value={Math.round(((selectedLayer as any).textOpacity ?? 1) * 100)}
                        onChange={(e) => updateLayer(selectedLayer.id, { textOpacity: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) / 100 })}
                        className="w-10 bg-transparent text-center text-[11px] font-mono font-bold text-[#000000] focus:outline-none"
                      />
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { textOpacity: Math.min(1, parseFloat((((selectedLayer as any).textOpacity ?? 1) + 0.05).toFixed(2))) })}
                        className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stroke / Outline Subsection Accordion */}
                <div className="border border-[#dadcdc] rounded-lg p-2.5 bg-[#f6f7f8] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#000000]">Stroke Outline</span>
                    <input
                      type="checkbox"
                      checked={(selectedLayer as any).strokeEnabled ?? false}
                      onChange={(e) => updateLayer(selectedLayer.id, { strokeEnabled: e.target.checked })}
                      className="w-4 h-4 accent-[#000000] cursor-pointer"
                    />
                  </div>

                  {(selectedLayer as any).strokeEnabled && (
                    <div className="space-y-2.5 pt-1.5 border-t border-[#dadcdc]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[#000000]">Stroke Color</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={(selectedLayer as any).strokeColor || '#000000'}
                            onChange={(e) => updateLayer(selectedLayer.id, { strokeColor: e.target.value })}
                            className="w-7 h-7 rounded border border-[#dadcdc] cursor-pointer bg-transparent"
                          />
                          <span className="font-mono text-[10px] text-[#000000] font-bold uppercase">
                            {(selectedLayer as any).strokeColor || '#000000'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#000000]">Stroke Thickness (mm)</span>
                          <span className="text-[10px] font-mono text-[#000000] font-bold">{((selectedLayer as any).strokeWidth ?? 0.5).toFixed(2)} mm</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0.1"
                            max="4"
                            step="0.05"
                            value={(selectedLayer as any).strokeWidth ?? 0.5}
                            onChange={(e) => updateLayer(selectedLayer.id, { strokeWidth: parseFloat(e.target.value) || 0.1 })}
                            className="flex-1 accent-[#000000] cursor-pointer"
                          />
                          <div className="flex items-center gap-0.5 border border-[#dadcdc] rounded-lg bg-[#E7E9EB] p-0.5">
                            <button
                              onClick={() => updateLayer(selectedLayer.id, { strokeWidth: Math.max(0.1, parseFloat((((selectedLayer as any).strokeWidth ?? 0.5) - 0.05).toFixed(2))) })}
                              className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <input
                              type="number"
                              step="0.05"
                              value={parseFloat(((selectedLayer as any).strokeWidth ?? 0.5).toFixed(2))}
                              onChange={(e) => updateLayer(selectedLayer.id, { strokeWidth: parseFloat(e.target.value) || 0.1 })}
                              className="w-10 bg-transparent text-center text-[11px] font-mono font-bold text-[#000000] focus:outline-none"
                            />
                            <button
                              onClick={() => updateLayer(selectedLayer.id, { strokeWidth: Math.min(4, parseFloat((((selectedLayer as any).strokeWidth ?? 0.5) + 0.05).toFixed(2))) })}
                              className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Text Shadow Subsection Accordion */}
                <div className="border border-[#dadcdc] rounded-lg p-2.5 bg-[#f6f7f8] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#000000]">Shadow Effects</span>
                    <input
                      type="checkbox"
                      checked={(selectedLayer as any).shadowEnabled ?? false}
                      onChange={(e) => updateLayer(selectedLayer.id, { shadowEnabled: e.target.checked })}
                      className="w-4 h-4 accent-[#000000] cursor-pointer"
                    />
                  </div>

                  {(selectedLayer as any).shadowEnabled && (
                    <div className="space-y-3.5 pt-1.5 border-t border-[#dadcdc]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[#000000]">Shadow Color</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={(selectedLayer as any).shadowColor || '#000000'}
                            onChange={(e) => updateLayer(selectedLayer.id, { shadowColor: e.target.value })}
                            className="w-7 h-7 rounded border border-[#dadcdc] cursor-pointer bg-transparent"
                          />
                          <span className="font-mono text-[10px] text-[#000000] font-bold uppercase">
                            {(selectedLayer as any).shadowColor || '#000000'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#000000]">Shadow Opacity</span>
                          <span className="text-[10px] font-mono text-[#000000] font-bold">{(selectedLayer as any).shadowOpacity ?? 50}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={(selectedLayer as any).shadowOpacity ?? 50}
                            onChange={(e) => updateLayer(selectedLayer.id, { shadowOpacity: parseInt(e.target.value, 10) || 0 })}
                            className="flex-1 accent-[#000000] cursor-pointer"
                          />
                          <div className="flex items-center gap-0.5 border border-[#dadcdc] rounded-lg bg-[#E7E9EB] p-0.5">
                            <button
                              onClick={() => updateLayer(selectedLayer.id, { shadowOpacity: Math.max(0, ((selectedLayer as any).shadowOpacity ?? 50) - 5) })}
                              className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <input
                              type="number"
                              value={(selectedLayer as any).shadowOpacity ?? 50}
                              onChange={(e) => updateLayer(selectedLayer.id, { shadowOpacity: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                              className="w-10 bg-transparent text-center text-[11px] font-mono font-bold text-[#000000] focus:outline-none"
                            />
                            <button
                              onClick={() => updateLayer(selectedLayer.id, { shadowOpacity: Math.min(100, ((selectedLayer as any).shadowOpacity ?? 50) + 5) })}
                              className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#000000]">Blur Radius (mm)</span>
                          <span className="text-[10px] font-mono text-[#000000] font-bold">{((selectedLayer as any).shadowBlur ?? 1.0).toFixed(2)} mm</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.05"
                            value={(selectedLayer as any).shadowBlur ?? 1.0}
                            onChange={(e) => updateLayer(selectedLayer.id, { shadowBlur: parseFloat(e.target.value) || 0 })}
                            className="flex-1 accent-[#000000] cursor-pointer"
                          />
                          <div className="flex items-center gap-0.5 border border-[#dadcdc] rounded-lg bg-[#E7E9EB] p-0.5">
                            <button
                              onClick={() => updateLayer(selectedLayer.id, { shadowBlur: Math.max(0, parseFloat((((selectedLayer as any).shadowBlur ?? 1.0) - 0.05).toFixed(2))) })}
                              className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <input
                              type="number"
                              step="0.05"
                              value={parseFloat(((selectedLayer as any).shadowBlur ?? 1.0).toFixed(2))}
                              onChange={(e) => updateLayer(selectedLayer.id, { shadowBlur: parseFloat(e.target.value) || 0 })}
                              className="w-10 bg-transparent text-center text-[11px] font-mono font-bold text-[#000000] focus:outline-none"
                            />
                            <button
                              onClick={() => updateLayer(selectedLayer.id, { shadowBlur: Math.min(5, parseFloat((((selectedLayer as any).shadowBlur ?? 1.0) + 0.05).toFixed(2))) })}
                              className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#000000]">X Offset (mm)</span>
                          <span className="text-[10px] font-mono text-[#000000] font-bold">{((selectedLayer as any).shadowOffsetX ?? 0.5).toFixed(2)} mm</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="-5"
                            max="5"
                            step="0.05"
                            value={(selectedLayer as any).shadowOffsetX ?? 0.5}
                            onChange={(e) => updateLayer(selectedLayer.id, { shadowOffsetX: parseFloat(e.target.value) || 0 })}
                            className="flex-1 accent-[#000000] cursor-pointer"
                          />
                          <div className="flex items-center gap-0.5 border border-[#dadcdc] rounded-lg bg-[#E7E9EB] p-0.5">
                            <button
                              onClick={() => updateLayer(selectedLayer.id, { shadowOffsetX: Math.max(-5, parseFloat((((selectedLayer as any).shadowOffsetX ?? 0.5) - 0.05).toFixed(2))) })}
                              className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <input
                              type="number"
                              step="0.05"
                              value={parseFloat(((selectedLayer as any).shadowOffsetX ?? 0.5).toFixed(2))}
                              onChange={(e) => updateLayer(selectedLayer.id, { shadowOffsetX: parseFloat(e.target.value) || 0 })}
                              className="w-10 bg-transparent text-center text-[11px] font-mono font-bold text-[#000000] focus:outline-none"
                            />
                            <button
                              onClick={() => updateLayer(selectedLayer.id, { shadowOffsetX: Math.min(5, parseFloat((((selectedLayer as any).shadowOffsetX ?? 0.5) + 0.05).toFixed(2))) })}
                              className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#000000]">Y Offset (mm)</span>
                          <span className="text-[10px] font-mono text-[#000000] font-bold">{((selectedLayer as any).shadowOffsetY ?? 0.5).toFixed(2)} mm</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="-5"
                            max="5"
                            step="0.05"
                            value={(selectedLayer as any).shadowOffsetY ?? 0.5}
                            onChange={(e) => updateLayer(selectedLayer.id, { shadowOffsetY: parseFloat(e.target.value) || 0 })}
                            className="flex-1 accent-[#000000] cursor-pointer"
                          />
                          <div className="flex items-center gap-0.5 border border-[#dadcdc] rounded-lg bg-[#E7E9EB] p-0.5">
                            <button
                              onClick={() => updateLayer(selectedLayer.id, { shadowOffsetY: Math.max(-5, parseFloat((((selectedLayer as any).shadowOffsetY ?? 0.5) - 0.05).toFixed(2))) })}
                              className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <input
                              type="number"
                              step="0.05"
                              value={parseFloat(((selectedLayer as any).shadowOffsetY ?? 0.5).toFixed(2))}
                              onChange={(e) => updateLayer(selectedLayer.id, { shadowOffsetY: parseFloat(e.target.value) || 0 })}
                              className="w-10 bg-transparent text-center text-[11px] font-mono font-bold text-[#000000] focus:outline-none"
                            />
                            <button
                              onClick={() => updateLayer(selectedLayer.id, { shadowOffsetY: Math.min(5, parseFloat((((selectedLayer as any).shadowOffsetY ?? 0.5) + 0.05).toFixed(2))) })}
                              className="p-1 hover:bg-[#dadcdc] rounded text-[#000000] cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* 2. POSITION & SIZE (Collapsible) */}
        <CollapsibleSection
          id="positionSize"
          title="Position & Size"
          icon={<Ruler className="w-3.5 h-3.5 text-[#000000]" />}
          badge={`${wDisplay} × ${hDisplay} ${activeUnit}`}
          isOpen={openSections.positionSize}
          onToggle={() => toggleSection('positionSize')}
        >
          {/* Alignment Tools (Single layer relative to card canvas) */}
          <div className="space-y-1">
            <div className="text-[#000000] font-semibold text-[10px]">Align to Card Canvas</div>
            <div className="grid grid-cols-6 gap-1 bg-[#E7E9EB] p-1 rounded-lg border border-[#dadcdc] text-[#000000]">
              <button
                onClick={() => alignSelectedLayers('left')}
                className="p-1.5 hover:bg-[#dadcdc] rounded flex items-center justify-center cursor-pointer"
                title="Align Left"
              >
                <AlignStartVertical className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => alignSelectedLayers('center')}
                className="p-1.5 hover:bg-[#dadcdc] rounded flex items-center justify-center cursor-pointer"
                title="Align Center"
              >
                <AlignCenterVertical className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => alignSelectedLayers('right')}
                className="p-1.5 hover:bg-[#dadcdc] rounded flex items-center justify-center cursor-pointer"
                title="Align Right"
              >
                <AlignEndVertical className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => alignSelectedLayers('top')}
                className="p-1.5 hover:bg-[#dadcdc] rounded flex items-center justify-center cursor-pointer"
                title="Align Top"
              >
                <AlignStartHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => alignSelectedLayers('middle')}
                className="p-1.5 hover:bg-[#dadcdc] rounded flex items-center justify-center cursor-pointer"
                title="Align Middle"
              >
                <AlignCenterHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => alignSelectedLayers('bottom')}
                className="p-1.5 hover:bg-[#dadcdc] rounded flex items-center justify-center cursor-pointer"
                title="Align Bottom"
              >
                <AlignEndHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* X & Y */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-[#000000] font-semibold block mb-0.5">X Position</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePositionChange('x', xDisplay - stepSize)}
                  className="px-1.5 py-1 bg-[#E7E9EB] hover:bg-[#dadcdc] border border-[#dadcdc] rounded text-[#000000] cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  step="0.1"
                  value={xDisplay}
                  onChange={(e) => handlePositionChange('x', parseFloat(e.target.value) || 0)}
                  className="w-full px-1 py-1 bg-[#E7E9EB] border border-[#dadcdc] rounded font-mono text-xs text-center text-[#000000] focus:outline-none focus:border-[#000000]"
                />
                <button
                  onClick={() => handlePositionChange('x', xDisplay + stepSize)}
                  className="px-1.5 py-1 bg-[#E7E9EB] hover:bg-[#dadcdc] border border-[#dadcdc] rounded text-[#000000] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-[#000000] font-semibold block mb-0.5">Y Position</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePositionChange('y', yDisplay - stepSize)}
                  className="px-1.5 py-1 bg-[#E7E9EB] hover:bg-[#dadcdc] border border-[#dadcdc] rounded text-[#000000] cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  step="0.1"
                  value={yDisplay}
                  onChange={(e) => handlePositionChange('y', parseFloat(e.target.value) || 0)}
                  className="w-full px-1 py-1 bg-[#E7E9EB] border border-[#dadcdc] rounded font-mono text-xs text-center text-[#000000] focus:outline-none focus:border-[#000000]"
                />
                <button
                  onClick={() => handlePositionChange('y', yDisplay + stepSize)}
                  className="px-1.5 py-1 bg-[#E7E9EB] hover:bg-[#dadcdc] border border-[#dadcdc] rounded text-[#000000] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Width & Height */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-[#000000] font-semibold block mb-0.5">Width</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePositionChange('width', Math.max(0.1, wDisplay - stepSize))}
                  className="px-1.5 py-1 bg-[#E7E9EB] hover:bg-[#dadcdc] border border-[#dadcdc] rounded text-[#000000] cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  step="0.1"
                  value={wDisplay}
                  onChange={(e) => handlePositionChange('width', parseFloat(e.target.value) || 1)}
                  className="w-full px-1 py-1 bg-[#E7E9EB] border border-[#dadcdc] rounded font-mono text-xs text-center text-[#000000] focus:outline-none focus:border-[#000000]"
                />
                <button
                  onClick={() => handlePositionChange('width', wDisplay + stepSize)}
                  className="px-1.5 py-1 bg-[#E7E9EB] hover:bg-[#dadcdc] border border-[#dadcdc] rounded text-[#000000] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-[#000000] font-semibold block mb-0.5">Height</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePositionChange('height', Math.max(0.1, hDisplay - stepSize))}
                  className="px-1.5 py-1 bg-[#E7E9EB] hover:bg-[#dadcdc] border border-[#dadcdc] rounded text-[#000000] cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  step="0.1"
                  value={hDisplay}
                  onChange={(e) => handlePositionChange('height', parseFloat(e.target.value) || 1)}
                  className="w-full px-1 py-1 bg-[#E7E9EB] border border-[#dadcdc] rounded font-mono text-xs text-center text-[#000000] focus:outline-none focus:border-[#000000]"
                />
                <button
                  onClick={() => handlePositionChange('height', hDisplay + stepSize)}
                  className="px-1.5 py-1 bg-[#E7E9EB] hover:bg-[#dadcdc] border border-[#dadcdc] rounded text-[#000000] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* 3. APPEARANCE & EFFECTS (Collapsible) */}
        <CollapsibleSection
          id="appearance"
          title="Appearance & Rotation"
          icon={<Palette className="w-3.5 h-3.5 text-[#000000]" />}
          isOpen={openSections.appearance}
          onToggle={() => toggleSection('appearance')}
        >
          {/* Professional Opacity / Transparency Control */}
          <div className="space-y-2 p-2.5 bg-[#E7E9EB]/70 rounded-xl border border-[#dadcdc]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#000000]">
                <Sun className="w-3.5 h-3.5 text-[#000000]" />
                <span>Opacity</span>
              </div>
              <span className="text-xs font-mono font-bold text-[#000000] bg-white px-2 py-0.5 rounded-md border border-[#dadcdc]">
                {Math.round((selectedLayer.opacity ?? 1) * 100)}%
              </span>
            </div>

            {/* Slider + Minus/Plus Stepper + Direct Numeric Input */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round((selectedLayer.opacity ?? 1) * 100)}
                onChange={(e) => {
                  const pct = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                  updateLayer(selectedLayer.id, { opacity: pct / 100 });
                }}
                className="flex-1 h-6 accent-[#000000] cursor-pointer touch-none"
              />

              <div className="flex items-center gap-0.5 border border-[#dadcdc] rounded-lg bg-white p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    const currentPct = Math.round((selectedLayer.opacity ?? 1) * 100);
                    const newPct = Math.max(0, currentPct - 5);
                    updateLayer(selectedLayer.id, { opacity: newPct / 100 });
                  }}
                  className="p-1 hover:bg-[#E7E9EB] active:bg-[#dadcdc] rounded text-[#000000] cursor-pointer min-w-[26px] min-h-[26px] flex items-center justify-center transition-colors"
                  title="Decrease Opacity (-5%)"
                >
                  <Minus className="w-3 h-3" />
                </button>

                <div className="flex items-center justify-center px-0.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round((selectedLayer.opacity ?? 1) * 100)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      const clamped = isNaN(val) ? 100 : Math.min(100, Math.max(0, val));
                      updateLayer(selectedLayer.id, { opacity: clamped / 100 });
                    }}
                    className="w-9 bg-transparent text-center text-[11px] font-mono font-bold text-[#000000] focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-[#555] -ml-1">%</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const currentPct = Math.round((selectedLayer.opacity ?? 1) * 100);
                    const newPct = Math.min(100, currentPct + 5);
                    updateLayer(selectedLayer.id, { opacity: newPct / 100 });
                  }}
                  className="p-1 hover:bg-[#E7E9EB] active:bg-[#dadcdc] rounded text-[#000000] cursor-pointer min-w-[26px] min-h-[26px] flex items-center justify-center transition-colors"
                  title="Increase Opacity (+5%)"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Touch-Friendly Quick Opacity Presets */}
            <div className="flex items-center gap-1 pt-1">
              {[0, 25, 50, 75, 100].map((preset) => {
                const currentPct = Math.round((selectedLayer.opacity ?? 1) * 100);
                const isSelected = currentPct === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => updateLayer(selectedLayer.id, { opacity: preset / 100 })}
                    className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#000000] text-white border-[#000000] shadow-sm'
                        : 'bg-white hover:bg-[#E7E9EB] text-[#000000] border-[#dadcdc]'
                    }`}
                  >
                    {preset}%
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#dadcdc] mt-3">
            <div>
              <label className="block text-[#000000] font-semibold mb-1 text-[11px]">Rotation (°)</label>
              <input
                type="number"
                value={selectedLayer.rotation || 0}
                onChange={(e) =>
                  updateLayer(selectedLayer.id, { rotation: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-2.5 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded-lg font-mono text-xs text-[#000000] focus:outline-none focus:border-[#000000]"
              />
            </div>
          </div>

          {/* Shape Specific Styling */}
          {selectedLayer.type === 'shape' && (
            <div className="space-y-2 pt-2 border-t border-[#E7E9EB]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#000000] font-semibold mb-1 text-[11px]">Fill Color</label>
                  <input
                    type="color"
                    value={selectedLayer.fill || '#3b82f6'}
                    onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value })}
                    className="w-8 h-8 rounded border border-[#dadcdc] cursor-pointer bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[#000000] font-semibold mb-1 text-[11px]">Stroke Color</label>
                  <input
                    type="color"
                    value={selectedLayer.stroke || '#1e3a8a'}
                    onChange={(e) => updateLayer(selectedLayer.id, { stroke: e.target.value })}
                    className="w-8 h-8 rounded border border-[#dadcdc] cursor-pointer bg-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#000000] font-semibold mb-1 text-[11px]">Stroke Width (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedLayer.strokeWidth || 0.5}
                  onChange={(e) =>
                    updateLayer(selectedLayer.id, { strokeWidth: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded font-mono text-xs text-[#000000] focus:outline-none focus:border-[#000000]"
                />
              </div>
            </div>
          )}

          {/* Placeholder Specific Styling */}
          {selectedLayer.type === 'placeholder' && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E7E9EB]">
              <div>
                <label className="block text-[#000000] font-semibold mb-1 text-[11px]">Border Color</label>
                <input
                  type="color"
                  value={selectedLayer.borderColor || '#1e3a8a'}
                  onChange={(e) => updateLayer(selectedLayer.id, { borderColor: e.target.value })}
                  className="w-8 h-8 rounded border border-[#dadcdc] cursor-pointer bg-transparent"
                />
              </div>
              <div>
                <label className="block text-[#000000] font-semibold mb-1 text-[11px]">Background</label>
                <input
                  type="color"
                  value={selectedLayer.backgroundColor || '#f1f5f9'}
                  onChange={(e) => updateLayer(selectedLayer.id, { backgroundColor: e.target.value })}
                  className="w-8 h-8 rounded border border-[#dadcdc] cursor-pointer bg-transparent"
                />
              </div>
            </div>
          )}

          {/* Barcode Specific Configuration */}
          {selectedLayer.type === 'barcode' && (
            <div className="space-y-2 pt-2 border-t border-[#E7E9EB]">
              <div>
                <label className="block text-[#000000] font-semibold mb-1 text-[11px]">Barcode Type</label>
                <select
                  value={selectedLayer.barcodeType}
                  onChange={(e) => updateLayer(selectedLayer.id, { barcodeType: e.target.value as any })}
                  className="w-full px-2 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded text-xs text-[#000000] font-semibold cursor-pointer"
                >
                  <option value="Code128">Code128 (Alphanumeric)</option>
                  <option value="PDF417">PDF417 (High Density 2D)</option>
                  <option value="EAN13">EAN13 (Numeric 13 Digits)</option>
                </select>
              </div>
              <div>
                <label className="block text-[#000000] font-semibold mb-1 text-[11px]">Data Expression</label>
                <input
                  type="text"
                  value={selectedLayer.data}
                  onChange={(e) => updateLayer(selectedLayer.id, { data: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded font-mono text-xs text-[#000000] focus:outline-none focus:border-[#000000]"
                />
              </div>
            </div>
          )}

          {/* QR Code Specific Configuration */}
          {selectedLayer.type === 'qrcode' && (
            <div className="space-y-2 pt-2 border-t border-[#E7E9EB]">
              <div>
                <label className="block text-[#000000] font-semibold mb-1 text-[11px]">Payload / Text</label>
                <textarea
                  rows={2}
                  value={selectedLayer.data}
                  onChange={(e) => updateLayer(selectedLayer.id, { data: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#E7E9EB] border border-[#dadcdc] rounded font-mono text-xs text-[#000000] focus:outline-none focus:border-[#000000]"
                />
              </div>
            </div>
          )}
        </CollapsibleSection>
      </div>
    </>
  );

  return renderPanelWrapper(singleContent);
};
