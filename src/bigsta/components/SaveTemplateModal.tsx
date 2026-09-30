import React, { useState, useEffect } from 'react';
import { X, Save, Copy, RefreshCw, CheckCircle, Tag, Layers, Star, Sparkles } from 'lucide-react';
import { useTemplateStore } from '../store/useTemplateStore';
import { CardTemplate, CardType, CardSide } from '../types';

export const SaveTemplateModal: React.FC = () => {
  const {
    isSaveModalOpen,
    setSaveModalOpen,
    currentTemplate,
    saveCurrentTemplate,
    saveAsNewTemplate,
    loadSavedTemplates,
    updateTemplateMeta,
    activeServiceId,
    saveUniversalFrontTemplate,
    saveUniversalBackTemplate,
  } = useTemplateStore();

  const [mode, setMode] = useState<'options' | 'saveAs'>('options');
  const [templateName, setTemplateName] = useState('');
  const [cardType, setCardType] = useState<CardType>('National ID');
  const [side, setSide] = useState<CardSide>('Front Side');
  const [existingTemplates, setExistingTemplates] = useState<CardTemplate[]>([]);
  const [conflictTemplate, setConflictTemplate] = useState<CardTemplate | null>(null);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Template Saved Successfully!');

  useEffect(() => {
    if (isSaveModalOpen) {
      setTemplateName(currentTemplate.templateName);
      setCardType(currentTemplate.cardType || 'National ID');
      setSide(currentTemplate.side || 'Front Side');
      setMode('options');
      setConflictTemplate(null);
      setIsSavedSuccess(false);
      setSuccessMessage('Template Saved Successfully!');

      loadSavedTemplates().then(setExistingTemplates);
    }
  }, [isSaveModalOpen, currentTemplate, loadSavedTemplates]);

  // Escape key listener
  useEffect(() => {
    if (!isSaveModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSaveModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaveModalOpen, setSaveModalOpen]);

  if (!isSaveModalOpen) return null;

  const handleQuickSave = async () => {
    updateTemplateMeta({ cardType, side });
    await saveCurrentTemplate();
    setSuccessMessage('Template Saved Successfully!');
    setIsSavedSuccess(true);
    setTimeout(() => {
      setIsSavedSuccess(false);
      setSaveModalOpen(false);
    }, 1200);
  };

  const handleUniversalSave = async () => {
    updateTemplateMeta({ cardType, side, serviceId: activeServiceId });
    
    const tplToSave = {
      ...currentTemplate,
      cardType,
      side,
      serviceId: activeServiceId,
      templateName: templateName.trim() || currentTemplate.templateName,
    };

    if (side === 'Back Side') {
      await saveUniversalBackTemplate(activeServiceId, tplToSave);
      setSuccessMessage(`Universal Back Template Saved for ${activeServiceId.replace('_', ' ').toUpperCase()}!`);
    } else {
      await saveUniversalFrontTemplate(activeServiceId, tplToSave);
      setSuccessMessage(`Universal Front Template Saved for ${activeServiceId.replace('_', ' ').toUpperCase()}!`);
    }

    setIsSavedSuccess(true);
    setTimeout(() => {
      setIsSavedSuccess(false);
      setSaveModalOpen(false);
    }, 1500);
  };

  const checkConflictAndSaveAs = async (nameToSave: string) => {
    const trimmed = nameToSave.trim();
    if (!trimmed) return;

    const existingMatch = existingTemplates.find(
      (t) => t.templateName.toLowerCase() === trimmed.toLowerCase() && t.id !== currentTemplate.id
    );

    if (existingMatch) {
      setConflictTemplate(existingMatch);
    } else {
      await saveAsNewTemplate(trimmed, cardType, side);
      setSuccessMessage('New Template Created & Saved!');
      setIsSavedSuccess(true);
      setTimeout(() => {
        setIsSavedSuccess(false);
        setSaveModalOpen(false);
      }, 1200);
    }
  };

  const handleReplaceExisting = async () => {
    if (!conflictTemplate) return;
    const updated = {
      ...currentTemplate,
      id: conflictTemplate.id,
      templateName: templateName.trim(),
      cardType,
      side,
      updatedAt: new Date().toISOString(),
    };
    useTemplateStore.getState().loadTemplate(updated);
    await saveCurrentTemplate();
    setSuccessMessage('Template Replaced Successfully!');
    setIsSavedSuccess(true);
    setTimeout(() => {
      setIsSavedSuccess(false);
      setSaveModalOpen(false);
    }, 1200);
  };

  const handleCreateNewCopy = async () => {
    const copyName = `${templateName.trim()} (Copy)`;
    await saveAsNewTemplate(copyName, cardType, side);
    setSuccessMessage('New Copy Created & Saved!');
    setIsSavedSuccess(true);
    setTimeout(() => {
      setIsSavedSuccess(false);
      setSaveModalOpen(false);
    }, 1200);
  };

  return (
    <div
      onClick={() => setSaveModalOpen(false)}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#FFFFFF] border border-[#E7E9EB] rounded-2xl shadow-xl overflow-hidden flex flex-col cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E7E9EB] flex items-center justify-between bg-[#FFFFFF]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#000000] text-white">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#000000]">Save Template</h2>
              <p className="text-xs text-[#555555] font-medium">
                Choose standard save or Universal Default Save
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSaveModalOpen(false)}
            className="p-1.5 text-[#555555] hover:text-[#000000] rounded-lg hover:bg-[#E7E9EB] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 bg-[#FFFFFF]">
          {isSavedSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-[#000000] animate-bounce" />
              <h3 className="text-base font-bold text-[#000000]">{successMessage}</h3>
              <p className="text-xs text-[#555555] font-medium">
                Your template data is safely stored in persistent storage.
              </p>
            </div>
          ) : conflictTemplate ? (
            /* Conflict Resolution View */
            <div className="space-y-4">
              <div className="p-4 bg-[#E7E9EB] border border-[#dadcdc] rounded-xl text-[#000000] text-xs leading-relaxed">
                <span className="font-bold block mb-1 text-[#000000]">Name Already Exists</span>
                A template named <span className="underline font-semibold">"{templateName}"</span>{' '}
                already exists in your library. Please choose how you want to proceed:
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReplaceExisting}
                  className="p-3.5 bg-[#FFFFFF] hover:bg-[#E7E9EB] border border-[#E7E9EB] rounded-xl text-left flex items-center gap-3 transition-colors group cursor-pointer"
                >
                  <RefreshCw className="w-5 h-5 text-[#000000] group-hover:rotate-180 transition-transform duration-300" />
                  <div>
                    <span className="font-bold text-sm text-[#000000] block">
                      Replace Existing Template
                    </span>
                    <span className="text-xs text-[#555555] font-medium">
                      Overwrite target template with current workspace design
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleCreateNewCopy}
                  className="p-3.5 bg-[#FFFFFF] hover:bg-[#E7E9EB] border border-[#E7E9EB] rounded-xl text-left flex items-center gap-3 transition-colors group cursor-pointer"
                >
                  <Copy className="w-5 h-5 text-[#000000]" />
                  <div>
                    <span className="font-bold text-sm text-[#000000] block">Create New Copy</span>
                    <span className="text-xs text-[#555555] font-medium">
                      Save as "{templateName} (Copy)" without touching existing file
                    </span>
                  </div>
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setConflictTemplate(null)}
                  className="px-4 py-2 bg-[#E7E9EB] hover:bg-[#dadcdc] text-[#000000] text-xs font-bold rounded-lg cursor-pointer"
                >
                  Back
                </button>
              </div>
            </div>
          ) : mode === 'options' ? (
            /* Save / Universal Save / Save As Choice */
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                {/* 1. Normal Save */}
                <button
                  type="button"
                  onClick={handleQuickSave}
                  className="p-4 bg-[#FFFFFF] hover:bg-[#E7E9EB]/50 border border-[#E7E9EB] hover:border-[#000000] rounded-xl text-left flex items-start justify-between transition-all group cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4 text-[#000000]" />
                      <span className="font-bold text-sm text-[#000000]">
                        1. Standard Save
                      </span>
                    </div>
                    <p className="text-xs text-[#555555] font-medium">
                      Updates "{currentTemplate.templateName}" in your library normally.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#000000] shrink-0 ml-2">Save →</span>
                </button>

                {/* 2. Universal Save */}
                <button
                  type="button"
                  onClick={handleUniversalSave}
                  className="p-4 bg-[#FFFFFF] hover:bg-[#CEE9B9]/30 border-2 border-[#CEE9B9] rounded-xl text-left flex items-start justify-between transition-all group shadow-xs cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-[#000000] text-[#000000]" />
                      <span className="font-bold text-sm text-[#000000] flex items-center gap-1.5">
                        2. Universal Save
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#CEE9B9] text-[#000000] uppercase border border-[#b8df9c]">
                          Permanent Default
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-[#555555] font-medium">
                      Saves template and sets Front + Back pair as the automatic default for all future NIDA filling sessions.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#000000] shrink-0 ml-2">Universal Save →</span>
                </button>

                {/* 3. Save As Copy */}
                <button
                  type="button"
                  onClick={() => setMode('saveAs')}
                  className="p-3.5 bg-[#FFFFFF] hover:bg-[#E7E9EB]/50 border border-[#E7E9EB] hover:border-[#000000] rounded-xl text-left flex items-start justify-between transition-all group cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-[#000000]" />
                      <span className="font-bold text-xs text-[#000000]">
                        Save As New Copy...
                      </span>
                    </div>
                    <p className="text-[11px] text-[#555555] font-medium">
                      Create a separate template with a unique name and metadata.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#000000] shrink-0 ml-2">New Copy →</span>
                </button>
              </div>
            </div>
          ) : (
            /* Save As Custom Form */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#000000] uppercase tracking-wider mb-1">
                  New Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. NIDA Front v2, Corporate Badge Back..."
                  className="w-full px-3.5 py-2.5 bg-[#FFFFFF] border border-[#E7E9EB] rounded-xl text-sm text-[#000000] placeholder-[#888888] focus:outline-none focus:border-[#000000]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#000000] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-[#000000]" />
                    Card Type
                  </label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value as CardType)}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E7E9EB] rounded-xl text-xs font-semibold text-[#000000] focus:outline-none focus:border-[#000000]"
                  >
                    <option value="National ID">National ID</option>
                    <option value="Employee ID">Employee ID</option>
                    <option value="Student ID">Student ID</option>
                    <option value="Membership Card">Membership Card</option>
                    <option value="Access Badge">Access Badge</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#000000] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#000000]" />
                    Card Side
                  </label>
                  <select
                    value={side}
                    onChange={(e) => setSide(e.target.value as CardSide)}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E7E9EB] rounded-xl text-xs font-semibold text-[#000000] focus:outline-none focus:border-[#000000]"
                  >
                    <option value="Front Side">Front Side</option>
                    <option value="Back Side">Back Side</option>
                    <option value="Full Card">Full Card</option>
                    <option value="Single Side">Single Side</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMode('options')}
                  className="px-4 py-2 bg-[#E7E9EB] hover:bg-[#dadcdc] text-[#000000] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => checkConflictAndSaveAs(templateName)}
                  disabled={!templateName.trim()}
                  className="px-5 py-2 bg-[#000000] hover:bg-[#222222] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save New Template</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
