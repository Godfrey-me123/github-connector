import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  Layers,
  CreditCard,
  ArrowRight,
  FolderOpen,
  Edit2,
  Trash2,
  Copy,
  Home,
} from 'lucide-react';
import { useTemplateStore } from '../store/useTemplateStore';
import { CardTemplate } from '../types';
import { SAMPLE_TEMPLATES } from '../utils/sampleTemplates';
import { TemplateBadge } from './TemplateBadge';
import { renderTemplateToCanvas } from '../utils/export';
import { AppFooter } from './common/AppFooter';
import { UniversalBackButton } from './common/UniversalBackButton';

export const UploadScreen: React.FC = () => {
  const {
    createNewTemplate,
    loadTemplate,
    addUploadedBackground,
    loadSavedTemplates,
    deleteSavedTemplate,
    saveCurrentTemplate,
    setActiveScreen,
    setCardGeneratorOpen,
  } = useTemplateStore();

  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; name: string } | null>(null);
  const [customName, setCustomName] = useState('My Custom ID Card');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saved templates state
  const [savedTemplates, setSavedTemplates] = useState<CardTemplate[]>([]);
  const [templatePreviews, setTemplatePreviews] = useState<Record<string, string>>({});

  const fetchSaved = async () => {
    const list = await loadSavedTemplates();
    setSavedTemplates(list);

    // Generate preview thumbnails for saved templates
    const previewMap: Record<string, string> = {};
    for (const tpl of list) {
      try {
        const canvas = await renderTemplateToCanvas(tpl, {}, 100);
        previewMap[tpl.id] = canvas.toDataURL('image/png');
      } catch {
        // Fallback silently
      }
    }
    setTemplatePreviews(previewMap);
  };

  useEffect(() => {
    fetchSaved();
  }, [loadSavedTemplates]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setPreviewImage(src);
        setImageMeta({
          width: img.width,
          height: img.height,
          name: file.name.replace(/\.[^/.]+$/, ''),
        });
        setCustomName(file.name.replace(/\.[^/.]+$/, '') + ' Template');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleCreateTemplate = async () => {
    if (previewImage && imageMeta) {
      const isPortrait = imageMeta.height > imageMeta.width;
      await addUploadedBackground({
        name: imageMeta.name || 'Uploaded Background',
        src: previewImage,
        originalWidthPx: imageMeta.width,
        originalHeightPx: imageMeta.height,
        orientation: isPortrait ? 'portrait' : 'landscape',
      });

      createNewTemplate(
        {
          type: 'image',
          src: previewImage,
          originalWidthPx: imageMeta.width,
          originalHeightPx: imageMeta.height,
        },
        customName || 'Custom ID Template'
      );
    } else {
      // Create with clean default background
      createNewTemplate(
        {
          type: 'color',
          color: '#ffffff',
        },
        'Blank ID Template'
      );
    }
  };

  const handleOpenEdit = (tpl: CardTemplate, e?: React.MouseEvent) => {
    e?.stopPropagation();
    loadTemplate(tpl);
    setActiveScreen('editor');
  };

  const handleUseInGenerator = (tpl: CardTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    loadTemplate(tpl);
    setCardGeneratorOpen(true);
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this saved template?')) {
      await deleteSavedTemplate(id);
      await fetchSaved();
    }
  };

  const handleDuplicateTemplate = async (tpl: CardTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy: CardTemplate = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: 'template_' + Date.now(),
      templateName: `${tpl.templateName} Copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    loadTemplate(copy);
    await saveCurrentTemplate();
    await fetchSaved();
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#000000] flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 font-sans overflow-y-auto">
      {/* Container */}
      <div className="w-full max-w-4xl bg-[#FFFFFF] border border-[#E7E9EB] rounded-2xl shadow-xs p-6 sm:p-10 text-center relative">
        {/* Brand Header & Top Actions */}
        <div className="mb-6 pb-4 border-b border-[#E7E9EB]">
          {/* BIGSTA badge on top */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#000000] text-white text-xs sm:text-sm font-bold tracking-wide mb-4">
            <CreditCard className="w-4 h-4" />
            <span>BIGSTA</span>
          </div>

          {/* Back + Saved Templates row */}
          <div className="flex items-center justify-between gap-4">
            <UniversalBackButton />

            {/* Saved Templates Section Button on First Screen */}
            <button
              onClick={() => setActiveScreen('templates')}
              className="flex items-center gap-2 px-4 py-2 bg-[#E7E9EB] hover:bg-[#dadcdc] border border-[#E7E9EB] text-[#000000] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-[#000000]" />
              <span>Saved Templates</span>
              {savedTemplates.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#CEE9B9] text-[#000000] text-[11px] font-extrabold border border-[#b8df9d]">
                  {savedTemplates.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#000000] tracking-tight mb-2">
          Upload Card Background
        </h1>
        <p className="text-[#555555] text-sm sm:text-base mb-8 max-w-md mx-auto font-medium">
          Start designing a reusable ID card template. Automatic orientation and dimension detection.
        </p>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 transition-all cursor-pointer flex flex-col items-center justify-center ${
            dragActive
              ? 'border-[#000000] bg-[#E7E9EB]'
              : previewImage
              ? 'border-[#000000] bg-[#FFFFFF]'
              : 'border-[#E7E9EB] hover:border-[#000000] bg-[#FFFFFF] hover:bg-[#F8FAFC]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {previewImage ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative group max-w-xs max-h-48 overflow-hidden rounded-lg border border-[#E7E9EB] shadow-xs">
                <img src={previewImage} alt="Background preview" className="object-contain max-h-44" />
              </div>
              <div className="text-xs text-[#000000] font-mono bg-[#E7E9EB] px-3 py-1.5 rounded-md border border-[#E7E9EB] font-bold">
                Auto Detected: {imageMeta?.width} × {imageMeta?.height} px (
                {imageMeta && imageMeta.height > imageMeta.width ? 'Portrait' : 'Landscape'})
              </div>
              <p className="text-xs text-[#000000] font-bold hover:underline">Click or drop to replace image</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-[#E7E9EB] text-[#000000]">
                <Upload className="w-8 h-8" />
              </div>
              <div className="text-sm sm:text-base font-bold text-[#000000]">
                Drag Image Here
              </div>
              <div className="text-xs text-[#777777] font-bold uppercase tracking-wider">OR</div>
              <button
                type="button"
                className="px-4 py-2 bg-[#000000] text-white text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer"
              >
                Choose Image
              </button>
              <p className="text-xs text-[#555555] mt-2 font-medium">
                Supported formats: <span className="text-[#000000] font-bold">PNG, JPG, WEBP</span>
              </p>
            </div>
          )}
        </div>

        {/* Custom Template Name Input */}
        {previewImage && (
          <div className="mt-6 text-left max-w-md mx-auto">
            <label className="block text-xs font-bold text-[#000000] uppercase mb-1.5">
              Template Name
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#FFFFFF] border border-[#E7E9EB] rounded-lg text-sm text-[#000000] focus:outline-none focus:border-[#000000]"
              placeholder="e.g. National ID Front"
            />
          </div>
        )}

        {/* Action Button */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleCreateTemplate}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#000000] hover:bg-[#222222] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
          >
            <span>Create Template</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Saved Templates Section on First Screen */}
        {savedTemplates.length > 0 && (
          <div className="mt-12 pt-8 border-t border-[#E7E9EB] text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#000000] text-sm uppercase font-bold tracking-wider">
                <FolderOpen className="w-4 h-4 text-[#000000]" />
                <span>Your Saved Templates ({savedTemplates.length})</span>
              </div>
              <button
                onClick={() => setActiveScreen('templates')}
                className="text-xs text-[#000000] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>View All Saved Templates</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedTemplates.slice(0, 6).map((tpl, idx) => (
                <div
                  key={`${tpl.id}-${idx}`}
                  onClick={() => handleOpenEdit(tpl)}
                  className="group relative bg-[#FFFFFF] border border-[#E7E9EB] hover:border-[#000000] rounded-xl p-4 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail Preview */}
                    <div className="w-full h-28 bg-[#E7E9EB]/50 rounded-lg border border-[#E7E9EB] flex items-center justify-center overflow-hidden mb-3 p-2 relative transition-colors">
                      {templatePreviews[tpl.id] ? (
                        <img
                          src={templatePreviews[tpl.id]}
                          alt={tpl.templateName}
                          className="max-h-full max-w-full object-contain rounded shadow-xs"
                        />
                      ) : (
                        <div className="text-[#666666] text-xs font-mono font-bold">Loading Preview...</div>
                      )}
                    </div>

                    {/* Template Meta */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-xs font-bold text-[#000000] group-hover:underline transition-colors line-clamp-1">
                        {tpl.templateName}
                      </h3>
                    </div>

                    <p className="text-[11px] text-[#555555] font-mono font-medium mb-2">
                      {tpl.cardWidth} × {tpl.cardHeight} mm | {tpl.layers.length} Layers
                    </p>

                    <TemplateBadge cardType={tpl.cardType} side={tpl.side} size="sm" />
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-[#E7E9EB] flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => handleOpenEdit(tpl, e)}
                      className="px-2.5 py-1.5 bg-[#000000] hover:bg-[#222222] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      title="Open and edit template in editor section"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={(e) => handleUseInGenerator(tpl, e)}
                      className="px-2.5 py-1.5 bg-[#CEE9B9] hover:bg-[#b8df9d] text-[#000000] text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      title="Use template in ID Generator"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDuplicateTemplate(tpl, e)}
                        className="p-1.5 text-[#555555] hover:text-[#000000] hover:bg-[#E7E9EB] rounded-lg transition-colors cursor-pointer"
                        title="Duplicate Template"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                        className="p-1.5 text-[#555555] hover:text-red-600 hover:bg-[#E7E9EB] rounded-lg transition-colors cursor-pointer"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pre-made Samples Section */}
        <div className="mt-12 pt-8 border-t border-[#E7E9EB]">
          <div className="flex items-center justify-center gap-2 text-[#555555] text-xs uppercase font-bold tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#000000]" />
            <span>Or Start with Pre-built Professional Templates</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {SAMPLE_TEMPLATES.map((sample, idx) => (
              <div
                key={`${sample.id}-${idx}`}
                onClick={() => loadTemplate(sample)}
                className="group p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E7E9EB] hover:border-[#000000] hover:bg-[#F8FAFC] transition-all cursor-pointer flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#000000] group-hover:underline transition-colors">
                      {sample.templateName}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#555555] font-mono">
                    {sample.cardWidth} × {sample.cardHeight} mm ({sample.orientation})
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#000000] group-hover:translate-x-1 transition-transform">
                  <span>Open Studio</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Global Application Footer */}
      <AppFooter className="max-w-4xl" />
    </div>
  );
};
