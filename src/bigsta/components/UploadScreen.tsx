import { bigstaConfirm } from "./common/BigstaConfirmModal";
// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
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
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Shield,
  FileText,
  Check,
  Compass,
} from "lucide-react";
import { useTemplateStore } from "../store/useTemplateStore";
import { CardTemplate } from "../types";
import { SAMPLE_TEMPLATES } from "../utils/sampleTemplates";
import { TemplateBadge } from "./TemplateBadge";
import { renderTemplateToCanvas } from "../utils/export";
import { AppFooter } from "./common/AppFooter";
import { UniversalBackButton } from "./common/UniversalBackButton";
import {
  SUPPORTED_DOCUMENT_CATEGORIES,
  resolveDocumentTypeId,
  normalizeSide,
} from "../utils/templateCategoryEngine";

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
    activeServiceId,
    setActiveServiceId,
    setActiveStudioLeftTab,
  } = useTemplateStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Uploaded image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{
    width: number;
    height: number;
    name: string;
    sizeKb: number;
  } | null>(null);

  // Configuration fields
  const [selectedCategory, setSelectedCategory] = useState<string>(activeServiceId || "nida");
  const [selectedSide, setSelectedSide] = useState<"front" | "back">("front");
  const [destinationMode, setDestinationMode] = useState<"new" | "existing">("new");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateName, setTemplateName] = useState("");
  const [bgName, setBgName] = useState("");

  // UI state
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Saved templates state
  const [savedTemplates, setSavedTemplates] = useState<CardTemplate[]>([]);
  const [templatePreviews, setTemplatePreviews] = useState<Record<string, string>>({});

  const fetchSaved = async () => {
    try {
      const list = await loadSavedTemplates();
      setSavedTemplates(list || []);

      // Generate preview thumbnails for saved templates
      const previewMap: Record<string, string> = {};
      for (const tpl of list || []) {
        try {
          const canvas = await renderTemplateToCanvas(tpl, {}, 100);
          previewMap[tpl.id] = canvas.toDataURL("image/png");
        } catch {
          // Fallback silently
        }
      }
      setTemplatePreviews(previewMap);
    } catch (e) {
      console.warn("Could not load saved templates in upload screen:", e);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, [loadSavedTemplates]);

  // Keep category in sync with store's activeServiceId initially
  useEffect(() => {
    if (activeServiceId && !selectedCategory) {
      setSelectedCategory(activeServiceId);
    }
  }, [activeServiceId]);

  // Templates filtered by currently selected document category
  const categoryTemplates = savedTemplates.filter((tpl) => {
    const docType = resolveDocumentTypeId(tpl, false) || tpl.serviceId || "";
    return docType === selectedCategory;
  });

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setValidationError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    setValidationError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onerror = () => {
      setValidationError("Failed to read the selected file. Please try again.");
    };
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onerror = () => {
        setValidationError("The selected image could not be decoded. Please choose another image.");
      };
      img.onload = () => {
        const cleanBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
        const meta = {
          width: img.width,
          height: img.height,
          name: file.name,
          sizeKb: Math.round(file.size / 1024),
        };
        setPreviewImage(src);
        setImageMeta(meta);

        // Pre-fill editable labels
        const categoryMeta = SUPPORTED_DOCUMENT_CATEGORIES.find((c) => c.id === selectedCategory);
        const catName = categoryMeta ? categoryMeta.displayName : selectedCategory.toUpperCase();
        setBgName(`${cleanBaseName} (${selectedSide.toUpperCase()})`);
        setTemplateName(`${catName} ${selectedSide === "front" ? "Front" : "Back"} Card`);
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
    // Reset file input value so re-selecting the same file triggers onChange
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    setImageMeta(null);
    setValidationError(null);
  };

  const handleReplaceImage = () => {
    fileInputRef.current?.click();
  };

  // Update prefilled names when category or side changes
  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setValidationError(null);

    const catMeta = SUPPORTED_DOCUMENT_CATEGORIES.find((c) => c.id === catId);
    const catName = catMeta ? catMeta.displayName : catId.toUpperCase();

    if (imageMeta) {
      const cleanBaseName = imageMeta.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
      setBgName(`${cleanBaseName} (${selectedSide.toUpperCase()})`);
      setTemplateName(`${catName} ${selectedSide === "front" ? "Front" : "Back"} Card`);
    }

    // Reset template selection if switching category
    setSelectedTemplateId("");
  };

  const handleSideChange = (side: "front" | "back") => {
    setSelectedSide(side);
    setValidationError(null);

    const catMeta = SUPPORTED_DOCUMENT_CATEGORIES.find((c) => c.id === selectedCategory);
    const catName = catMeta ? catMeta.displayName : selectedCategory.toUpperCase();

    if (imageMeta) {
      const cleanBaseName = imageMeta.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
      setBgName(`${cleanBaseName} (${side.toUpperCase()})`);
      setTemplateName(`${catName} ${side === "front" ? "Front" : "Back"} Card`);
    }
  };

  // Continue to Studio Handler
  const handleContinueToStudio = async () => {
    if (!previewImage || !imageMeta) {
      setValidationError("Please select a background image to upload.");
      return;
    }

    if (!selectedCategory) {
      setValidationError("Please select a document category.");
      return;
    }

    if (!selectedSide) {
      setValidationError("Please select a card side (Front or Back).");
      return;
    }

    if (!bgName.trim()) {
      setValidationError("Please enter a background name.");
      return;
    }

    if (destinationMode === "existing" && !selectedTemplateId) {
      setValidationError("Please select an existing template or choose 'Create New Template'.");
      return;
    }

    if (destinationMode === "new" && !templateName.trim()) {
      setValidationError("Please enter a template name.");
      return;
    }

    setValidationError(null);
    setIsProcessing(true);

    try {
      const isPortrait = imageMeta.height > imageMeta.width;
      const targetTemplateId =
        destinationMode === "existing" && selectedTemplateId
          ? selectedTemplateId
          : `template_${Date.now()}`;

      // 1. Save background asset record to store & storage with 3 independent identifiers
      // Note: isActive: false so it does not prematurely overwrite existing active backgrounds
      const uploadedBg = await addUploadedBackground({
        name: bgName.trim(),
        src: previewImage,
        originalWidthPx: imageMeta.width,
        originalHeightPx: imageMeta.height,
        orientation: isPortrait ? "portrait" : "landscape",
        documentTypeId: selectedCategory,
        document_type_id: selectedCategory,
        templateId: targetTemplateId,
        template_id: targetTemplateId,
        side: selectedSide,
        isActive: false, // Rule: saving a new background must not automatically activate it!
      });

      const bgConfig = {
        type: "image" as const,
        src: uploadedBg.src || previewImage,
        originalWidthPx: imageMeta.width,
        originalHeightPx: imageMeta.height,
        opacity: 1,
      };

      // 2. Route to the correct category and side-specific studio
      if (destinationMode === "existing" && selectedTemplateId) {
        const existingTpl = savedTemplates.find((t) => t.id === selectedTemplateId);
        if (existingTpl) {
          const isBack = selectedSide === "back";
          const updatedTpl: CardTemplate = {
            ...existingTpl,
            serviceId: selectedCategory,
            side: isBack ? "Back Side" : "Front Side",
            isBackSide: isBack,
            background: bgConfig,
            ...(isBack
              ? {
                  back_background: bgConfig,
                  active_back_bg_id: uploadedBg.id,
                  back_status: "configured" as const,
                }
              : {
                  front_background: bgConfig,
                  active_front_bg_id: uploadedBg.id,
                  front_status: "configured" as const,
                }),
            updatedAt: new Date().toISOString(),
          };

          loadTemplate(updatedTpl);
          useTemplateStore.setState({
            activeServiceId: selectedCategory,
            activeEditorSide: selectedSide,
            activeStudioLeftTab: "backgrounds",
            activeScreen: "editor",
            studioMode: true,
          });
        }
      } else {
        // Create new template with explicit category, side, and background
        createNewTemplate(
          bgConfig,
          templateName.trim(),
          selectedCategory,
          selectedSide,
          targetTemplateId,
        );
      }

      toast.success(
        `Background loaded into ${selectedCategory.toUpperCase()} (${selectedSide.toUpperCase()}) studio.`,
      );
    } catch (err: any) {
      console.error("Failed to prepare editing studio:", err);
      setValidationError(err?.message || "Failed to prepare editing studio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenEdit = (tpl: CardTemplate, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const docTypeId = resolveDocumentTypeId(tpl, false) || tpl.serviceId || "nida";
    loadTemplate({ ...tpl, serviceId: docTypeId });
  };

  const handleUseInGenerator = (tpl: CardTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    loadTemplate(tpl);
    setCardGeneratorOpen(true);
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const shouldDelete = await bigstaConfirm({ title: "BIGsta", message: "Are you sure you want to delete this saved template?", isDestructive: true }); if (shouldDelete) {
      await deleteSavedTemplate(id);
      await fetchSaved();
    }
  };

  const handleDuplicateTemplate = async (tpl: CardTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy: CardTemplate = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: "template_" + Date.now(),
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main Card Container */}
      <div className="w-full max-w-4xl bg-[#FFFFFF] border border-[#E7E9EB] rounded-2xl shadow-xs p-6 sm:p-10 relative">
        {/* Header Bar */}
        <div className="mb-6 pb-4 border-b border-[#E7E9EB]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#000000] text-white text-xs sm:text-sm font-bold tracking-wide">
                <CreditCard className="w-4 h-4" />
                <span>BIGSTA</span>
              </div>
              <span className="text-xs font-mono font-bold text-[#555555] uppercase tracking-wider hidden sm:inline">
                Admin Studio Setup
              </span>
            </div>

            <div className="flex items-center gap-2">
              <UniversalBackButton />

              <button
                type="button"
                onClick={() => setActiveScreen("templates")}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#E7E9EB] hover:bg-[#dadcdc] border border-[#dadcdc] text-[#000000] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
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
        </div>

        {/* Title and Intro */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#000000] tracking-tight mb-2">
            Upload Card Background
          </h1>
          <p className="text-[#555555] text-xs sm:text-sm max-w-lg mx-auto font-medium">
            Upload an ID card background image, select its category and side, and configure its
            template before proceeding to the Editing Studio.
          </p>
        </div>

        {/* Validation Error Alert */}
        {validationError && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{validationError}</span>
          </div>
        )}

        {/* STEP 1 & 2: Upload & Preview Area */}
        {!previewImage ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
              dragActive
                ? "border-[#000000] bg-[#E7E9EB]"
                : "border-[#dadcdc] hover:border-[#000000] bg-[#F8FAFC] hover:bg-[#F1F5F9]"
            }`}
          >
            <div className="p-4 rounded-full bg-[#E7E9EB] text-[#000000] mb-3">
              <Upload className="w-8 h-8" />
            </div>
            <div className="text-base sm:text-lg font-extrabold text-[#000000] mb-1">
              Select or Drop Card Background Image
            </div>
            <p className="text-xs text-[#555555] font-medium mb-4 max-w-sm">
              Supports high-resolution PNG, JPG, and WEBP assets. Dimensions and orientation are
              auto-detected.
            </p>
            <button
              type="button"
              className="px-5 py-2.5 bg-[#000000] hover:bg-[#222222] text-white text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Choose Image File
            </button>
          </div>
        ) : (
          /* STEP 2: Large Preview with Detected Specs & Replace/Remove options */
          <div className="p-5 bg-[#F8FAFC] border border-[#E7E9EB] rounded-2xl mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Image Preview Box */}
              <div className="w-full sm:w-64 h-44 bg-white border border-[#dadcdc] rounded-xl overflow-hidden flex items-center justify-center p-2 shrink-0 shadow-xs">
                <img
                  src={previewImage}
                  alt="Card Background Preview"
                  className="max-w-full max-h-full object-contain rounded"
                />
              </div>

              {/* Detected Specs & Metadata */}
              <div className="flex-1 w-full text-left space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777] block">
                      Uploaded Image File
                    </span>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#000000] break-all">
                      {imageMeta?.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleReplaceImage}
                      className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#E7E9EB] text-[#000000] border border-[#dadcdc] rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="Replace image with another file"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Replace</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-all cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Detected Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono font-bold">
                  <div className="px-2.5 py-1 rounded-lg bg-white border border-[#dadcdc] text-[#000000] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {imageMeta?.width} × {imageMeta?.height} px
                    </span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-white border border-[#dadcdc] text-[#000000] flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-purple-600" />
                    <span>{imageMeta && imageMeta.height > imageMeta.width ? "Portrait" : "Landscape"}</span>
                  </div>

                  {imageMeta?.sizeKb ? (
                    <div className="px-2.5 py-1 rounded-lg bg-white border border-[#dadcdc] text-[#555555]">
                      {imageMeta.sizeKb} KB
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Image verified and ready for template configuration.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Configuration Form (Enabled when image is selected) */}
        {previewImage && (
          <div className="space-y-6 pt-2 text-left border-t border-[#E7E9EB]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#000000] uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#000000]" />
                <span>Configure Category & Side Assignment</span>
              </h2>
              <span className="text-xs text-[#777777] font-medium">Step 3 of 4</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Field A: Document Category */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase text-[#000000] tracking-wide">
                  1. Document Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#dadcdc] focus:border-[#000000] rounded-xl text-xs sm:text-sm font-bold text-[#000000] focus:outline-none cursor-pointer"
                >
                  {SUPPORTED_DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.displayName} ({cat.name})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#777777]">
                  Ensures isolated storage and database mapping. Never defaults to NIDA if another
                  category is chosen.
                </p>
              </div>

              {/* Field B: Card Side (Front vs Back) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase text-[#000000] tracking-wide">
                  2. Card Side <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSideChange("front")}
                    className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      selectedSide === "front"
                        ? "bg-[#000000] text-white border-[#000000] shadow-xs"
                        : "bg-white text-[#000000] border-[#dadcdc] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {selectedSide === "front" && <Check className="w-3.5 h-3.5" />}
                    <span>Front Side</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSideChange("back")}
                    className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      selectedSide === "back"
                        ? "bg-[#000000] text-white border-[#000000] shadow-xs"
                        : "bg-white text-[#000000] border-[#dadcdc] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {selectedSide === "back" && <Check className="w-3.5 h-3.5" />}
                    <span>Back Side</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#777777]">
                  Front and Back backgrounds are managed independently and never overwrite each
                  other.
                </p>
              </div>
            </div>

            {/* Field C: Template / Card Destination */}
            <div className="p-4 bg-[#F8FAFC] border border-[#dadcdc] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold uppercase text-[#000000] tracking-wide">
                  3. Destination Card / Template
                </label>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setDestinationMode("new")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      destinationMode === "new"
                        ? "bg-[#000000] text-white"
                        : "text-[#555555] hover:text-[#000000]"
                    }`}
                  >
                    New Card
                  </button>

                  {categoryTemplates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDestinationMode("existing")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        destinationMode === "existing"
                          ? "bg-[#000000] text-white"
                          : "text-[#555555] hover:text-[#000000]"
                      }`}
                    >
                      Update Existing Card ({categoryTemplates.length})
                    </button>
                  )}
                </div>
              </div>

              {destinationMode === "new" ? (
                <div>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Tanzania Driver Licence Class B"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#dadcdc] focus:border-[#000000] rounded-xl text-xs sm:text-sm font-semibold text-[#000000] focus:outline-none"
                  />
                  <p className="text-[11px] text-[#777777] mt-1">
                    Creates a dedicated new card template under {selectedCategory.toUpperCase()} for
                    this background.
                  </p>
                </div>
              ) : (
                <div>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#dadcdc] focus:border-[#000000] rounded-xl text-xs sm:text-sm font-bold text-[#000000] focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Choose an existing card in this category --</option>
                    {categoryTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.templateName} ({t.cardWidth}×{t.cardHeight}mm)
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#777777] mt-1">
                    Updates the {selectedSide.toUpperCase()} background of the selected card
                    without modifying its opposite side.
                  </p>
                </div>
              )}
            </div>

            {/* Field D: Background Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase text-[#000000] tracking-wide">
                4. Background Asset Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bgName}
                onChange={(e) => setBgName(e.target.value)}
                placeholder="e.g. Official Front Background 2026"
                className="w-full px-3.5 py-2.5 bg-white border border-[#dadcdc] focus:border-[#000000] rounded-xl text-xs sm:text-sm font-semibold text-[#000000] focus:outline-none"
              />
              <p className="text-[11px] text-[#777777]">
                The background name stored in the library for future reference and selection.
              </p>
            </div>

            {/* STEP 4: Continue Button */}
            <div className="pt-4 border-t border-[#E7E9EB] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRemoveImage}
                className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-bold text-[#555555] hover:text-[#000000] hover:bg-[#E7E9EB] rounded-xl transition-all cursor-pointer"
              >
                Cancel &amp; Reset
              </button>

              <button
                type="button"
                onClick={handleContinueToStudio}
                disabled={isProcessing}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#000000] hover:bg-[#222222] disabled:opacity-50 text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Preparing Studio Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Editing Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Saved Templates Section on First Screen */}
        {savedTemplates.length > 0 && (
          <div className="mt-12 pt-8 border-t border-[#E7E9EB] text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#000000] text-sm uppercase font-bold tracking-wider">
                <FolderOpen className="w-4 h-4 text-[#000000]" />
                <span>Your Saved Templates ({savedTemplates.length})</span>
              </div>
              <button
                onClick={() => setActiveScreen("templates")}
                className="text-xs text-[#000000] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>View All Templates</span>
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
                        <div className="text-[#666666] text-xs font-mono font-bold">
                          Preview Available in Studio
                        </div>
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
