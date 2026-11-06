// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Upload,
  Check,
  Edit3,
  Trash2,
  RefreshCw,
  Palette,
  Sun,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useTemplateStore } from "../store/useTemplateStore";
import { isBackSideTemplate } from "../utils/templateMappingEngine";
import {
  resolveDocumentTypeId,
  normalizeSide,
  checkTemplateCompletion,
  SUPPORTED_DOCUMENT_CATEGORIES,
} from "../utils/templateCategoryEngine";

interface BackgroundsPanelProps {
  onBackgroundSelected?: () => void;
}

export const BackgroundsPanel: React.FC<BackgroundsPanelProps> = ({ onBackgroundSelected }) => {
  const {
    currentTemplate,
    updateTemplateMeta,
    uploadedBackgrounds,
    loadUploadedBackgrounds,
    addUploadedBackground,
    updateUploadedBackground,
    deleteUploadedBackground,
    activateBackground,
    switchEditorSide,
    activeEditorSide,
    setIsSaving,
    activeServiceId,
    frontPopulatedTemplate,
    backPopulatedTemplate,
    completionBannerMessage,
  } = useTemplateStore();

  const [editingBgId, setEditingBgId] = useState<string | null>(null);
  const [editingBgName, setEditingBgName] = useState("");

  // Determine current 3 independent identifiers
  const currentCategory =
    resolveDocumentTypeId(currentTemplate, false) ||
    currentTemplate.serviceId ||
    activeServiceId ||
    "nida";
  const templateId = currentTemplate.id;
  const activeSide = activeEditorSide || normalizeSide(currentTemplate);

  // Tab selection inside Backgrounds Panel: defaults to currently active editor side
  const [selectedSideTab, setSelectedSideTab] = useState<"front" | "back">(activeSide);

  // Sync tab with editor side when editor side changes externally
  useEffect(() => {
    setSelectedSideTab(activeSide);
  }, [activeSide]);

  // Load backgrounds scoped to this category
  useEffect(() => {
    loadUploadedBackgrounds(currentCategory, templateId, selectedSideTab);
  }, [loadUploadedBackgrounds, currentCategory, templateId, selectedSideTab]);

  // Check completion status of current template
  const completion = checkTemplateCompletion(
    currentTemplate,
    uploadedBackgrounds,
    frontPopulatedTemplate,
    backPopulatedTemplate,
  );

  // Category display name
  const categoryConfig =
    SUPPORTED_DOCUMENT_CATEGORIES.find((c) => c.id === currentCategory) || {
      displayName: currentCategory.toUpperCase(),
    };

  // Filter backgrounds strictly by category and side
  const filteredBackgrounds = uploadedBackgrounds.filter((bg) => {
    const bgDocType =
      bg.documentTypeId || bg.document_type_id || bg.serviceType || currentCategory;
    if (bgDocType !== currentCategory) return false;

    const bgSide = normalizeSide(bg.side || (bg.name?.toLowerCase().includes("back") ? "back" : "front"));
    return bgSide === selectedSideTab;
  });

  const handleBgLibraryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setIsSaving(false);
      toast.error("Failed to read selected image file.");
    };
    reader.onload = async (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onerror = () => {
        setIsSaving(false);
        toast.error("Failed to parse selected image element.");
      };
      img.onload = async () => {
        try {
          const orientation = img.height > img.width ? "portrait" : "landscape";
          const newBgName = `${file.name.split(".")[0] || "Card Background"} (${selectedSideTab.toUpperCase()})`;

          // Save with the three independent identifiers
          const newBg = await addUploadedBackground({
            name: newBgName,
            src,
            originalWidthPx: img.width,
            originalHeightPx: img.height,
            orientation,
            documentTypeId: currentCategory,
            document_type_id: currentCategory,
            templateId: templateId,
            template_id: templateId,
            side: selectedSideTab,
            isActive: true,
          });

          // Ensure editor side matches the tab uploaded to
          if (activeSide !== selectedSideTab) {
            await switchEditorSide(selectedSideTab);
          }

          onBackgroundSelected?.();
        } catch (err: any) {
          toast.error(err?.message || "Failed to upload background image.");
        } finally {
          setIsSaving(false);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleReplaceBg = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setIsSaving(false);
      toast.error("Failed to read image file for replacement.");
    };
    reader.onload = async (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onerror = () => {
        setIsSaving(false);
        toast.error("Failed to load image file for replacement.");
      };
      img.onload = async () => {
        try {
          const orientation = img.height > img.width ? "portrait" : "landscape";
          await updateUploadedBackground(id, {
            src,
            originalWidthPx: img.width,
            originalHeightPx: img.height,
            orientation,
            documentTypeId: currentCategory,
            side: selectedSideTab,
          });

          // If this background is currently in use on active side, re-activate it
          const isCurrentlyActive =
            currentTemplate.background.src === src ||
            currentTemplate.background.src?.includes(id) ||
            (selectedSideTab === "front" && currentTemplate.active_front_bg_id === id) ||
            (selectedSideTab === "back" && currentTemplate.active_back_bg_id === id);

          if (isCurrentlyActive) {
            await activateBackground(id, currentCategory, templateId, selectedSideTab);
          }
        } catch (err: any) {
          toast.error(err?.message || "Failed to replace background.");
        } finally {
          setIsSaving(false);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleApplyBackground = async (bg: any) => {
    setIsSaving(true);
    try {
      // Ensure canvas is on the corresponding side
      if (activeSide !== selectedSideTab) {
        await switchEditorSide(selectedSideTab);
      }

      await activateBackground(bg.id, currentCategory, templateId, selectedSideTab);
      onBackgroundSelected?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply background.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReplaceCurrentActivePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setIsSaving(false);
      toast.error("Failed to read image file.");
    };
    reader.onload = async (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onerror = () => {
        setIsSaving(false);
        toast.error("Failed to parse image file.");
      };
      img.onload = async () => {
        try {
          const orientation = img.height > img.width ? "portrait" : "landscape";

          // Find active background for current side
          const activeBg = filteredBackgrounds.find(
            (bg) =>
              (selectedSideTab === "front" &&
                (currentTemplate.active_front_bg_id === bg.id ||
                  (activeSide === "front" && currentTemplate.background.src === bg.src))) ||
              (selectedSideTab === "back" &&
                (currentTemplate.active_back_bg_id === bg.id ||
                  (activeSide === "back" && currentTemplate.background.src === bg.src))) ||
              (bg.isActive && bg.side === selectedSideTab),
          );

          if (activeBg) {
            // Update the existing active background record in place
            await updateUploadedBackground(activeBg.id, {
              src,
              originalWidthPx: img.width,
              originalHeightPx: img.height,
              orientation,
            });
            await activateBackground(activeBg.id, currentCategory, templateId, selectedSideTab);
          } else {
            // If no active background record in library, update template background directly
            const bgConfig = {
              type: "image" as const,
              src,
              originalWidthPx: img.width,
              originalHeightPx: img.height,
              opacity: currentTemplate.background?.opacity ?? 1,
            };
            updateTemplateMeta({
              background: bgConfig,
              ...(selectedSideTab === "front"
                ? { front_background: bgConfig }
                : { back_background: bgConfig }),
            });
          }

          if (activeSide !== selectedSideTab) {
            await switchEditorSide(selectedSideTab);
          }

          onBackgroundSelected?.();
        } catch (err: any) {
          toast.error(err?.message || "Failed to replace current active photo.");
        } finally {
          setIsSaving(false);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const presetColors = [
    "#ffffff",
    "#f8fafc",
    "#f1f5f9",
    "#0f172a",
    "#1e293b",
    "#1e3a8a",
    "#065f46",
    "#831843",
    "#4c1d95",
    "#fef08a",
  ];

  return (
    <div className="space-y-4 pb-4 select-none">
      {/* Category & Template Context Header */}
      <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Document Category
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {categoryConfig.displayName}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Template
          </span>
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[150px]">
            {currentTemplate.templateName}
          </span>
        </div>
      </div>

      {/* Side Selector Tabs (Front vs Back) */}
      <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={async () => {
            setSelectedSideTab("front");
            if (activeSide !== "front") {
              await switchEditorSide("front");
            }
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedSideTab === "front"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <span>Front Side</span>
          <span
            className={`w-2 h-2 rounded-full ${
              completion.front_status === "configured" ? "bg-emerald-400" : "bg-amber-400"
            }`}
            title={`Front: ${completion.front_status}`}
          />
        </button>

        <button
          type="button"
          onClick={async () => {
            setSelectedSideTab("back");
            if (activeSide !== "back") {
              await switchEditorSide("back");
            }
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedSideTab === "back"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <span>Back Side</span>
          <span
            className={`w-2 h-2 rounded-full ${
              completion.back_status === "configured" ? "bg-emerald-400" : "bg-amber-400"
            }`}
            title={`Back: ${completion.back_status}`}
          />
        </button>
      </div>

      {/* Intelligent Front/Back Completion Check Alert Banner */}
      <div
        className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
          completion.situation === "D"
            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
            : completion.situation === "A"
            ? "bg-amber-950/40 border-amber-500/50 text-amber-200"
            : "bg-blue-950/40 border-blue-500/50 text-blue-200"
        }`}
      >
        <div className="flex items-center gap-1.5 font-bold">
          {completion.situation === "D" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>
            {completion.situation === "D"
              ? "Template Configuration Complete"
              : "Background Setup Status"}
          </span>
        </div>
        <p className="text-[11px] opacity-90">
          {completionBannerMessage || completion.statusMessage}
        </p>

        {/* Quick helper action if opposite side is missing */}
        {completion.situation === "B" && selectedSideTab === "front" && (
          <button
            type="button"
            onClick={async () => {
              setSelectedSideTab("back");
              await switchEditorSide("back");
            }}
            className="mt-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Switch to configure Back background</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
        {completion.situation === "C" && selectedSideTab === "back" && (
          <button
            type="button"
            onClick={async () => {
              setSelectedSideTab("front");
              await switchEditorSide("front");
            }}
            className="mt-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Switch to configure Front background</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 1. Background Color Section */}
      <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Palette className="w-3.5 h-3.5 text-blue-400" />
          <span>{selectedSideTab === "front" ? "Front" : "Back"} Canvas Color</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="color"
            value={currentTemplate.background?.color || "#ffffff"}
            onChange={(e) =>
              updateTemplateMeta({
                background: { type: "color", color: e.target.value },
              })
            }
            className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
          />
          <span className="font-mono text-xs text-slate-200 uppercase">
            {currentTemplate.background?.color || "#ffffff"}
          </span>
        </div>

        {/* Quick color swatches */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {presetColors.map((col) => (
            <button
              key={col}
              onClick={() =>
                updateTemplateMeta({
                  background: {
                    type: "color",
                    color: col,
                    opacity: currentTemplate.background?.opacity,
                  },
                })
              }
              className="w-6 h-6 rounded-md border border-slate-700/80 shadow-sm transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
              style={{ backgroundColor: col }}
              title={col}
            >
              {currentTemplate.background?.color === col && (
                <Check
                  className={`w-3.5 h-3.5 ${
                    col === "#ffffff" || col === "#f8fafc" || col === "#fef08a"
                      ? "text-slate-900"
                      : "text-white"
                  }`}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Background Image Opacity Control (when background is an image) */}
      {currentTemplate.background?.type === "image" && (
        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Sun className="w-3.5 h-3.5 text-blue-400" />
              <span>{selectedSideTab === "front" ? "Front" : "Back"} Image Opacity</span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
              {Math.round((currentTemplate.background.opacity ?? 1) * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round((currentTemplate.background.opacity ?? 1) * 100)}
              onChange={(e) => {
                const pct = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                updateTemplateMeta({
                  background: {
                    ...currentTemplate.background,
                    opacity: pct / 100,
                  },
                });
              }}
              className="flex-1 accent-blue-500 cursor-pointer h-6"
            />
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1 pt-1">
            {[0, 25, 50, 75, 100].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() =>
                  updateTemplateMeta({
                    background: {
                      ...currentTemplate.background,
                      opacity: preset / 100,
                    },
                  })
                }
                className={`flex-1 py-1 text-[10px] font-mono font-bold rounded transition-colors cursor-pointer ${
                  Math.round((currentTemplate.background.opacity ?? 1) * 100) === preset
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-700/60 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Uploaded Background Image Library - Filtered Strictly by Side */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between pb-1 border-b border-slate-800 text-xs gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-300">
              {selectedSideTab === "front" ? "Front" : "Back"} Backgrounds (
              {filteredBackgrounds.length})
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              [{categoryConfig.displayName}]
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label
              className={`min-h-[36px] px-3 py-1 text-white rounded-lg font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm ${
                selectedSideTab === "front"
                  ? "bg-blue-600 hover:bg-blue-500"
                  : "bg-purple-600 hover:bg-purple-500"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload {selectedSideTab === "front" ? "Front" : "Back"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleBgLibraryUpload}
                className="hidden"
              />
            </label>

            {/* Replace Photo Button */}
            <label
              className="min-h-[36px] px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="Replace currently active photo/background image"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Replace Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleReplaceCurrentActivePhoto}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {filteredBackgrounds.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-900/50 rounded-xl border border-dashed border-slate-800 text-xs text-slate-500 space-y-1">
            <p>
              No {selectedSideTab} backgrounds found for {categoryConfig.displayName}.
            </p>
            <p className="text-[11px] text-slate-600">
              Click &quot;Upload {selectedSideTab === "front" ? "Front" : "Back"}&quot; to configure this side independently.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBackgrounds.map((bg) => {
              // Active check: matches current template's background src for this side
              const isActive =
                (selectedSideTab === "front" &&
                  (currentTemplate.active_front_bg_id === bg.id ||
                    (activeSide === "front" && currentTemplate.background.src === bg.src))) ||
                (selectedSideTab === "back" &&
                  (currentTemplate.active_back_bg_id === bg.id ||
                    (activeSide === "back" && currentTemplate.background.src === bg.src))) ||
                (bg.isActive && bg.side === selectedSideTab);

              const isEditing = editingBgId === bg.id;

              return (
                <div
                  key={bg.id}
                  className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all ${
                    isActive
                      ? selectedSideTab === "front"
                        ? "bg-blue-950/40 border-blue-500/80 shadow-md shadow-blue-900/20 ring-1 ring-blue-500/40"
                        : "bg-purple-950/40 border-purple-500/80 shadow-md shadow-purple-900/20 ring-1 ring-purple-500/40"
                      : "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800"
                  }`}
                >
                  {/* Thumbnail & Info */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-14 h-10 rounded-lg border border-slate-700 bg-slate-950 overflow-hidden flex items-center justify-center shrink-0">
                      <img src={bg.src} alt={bg.name} className="object-cover w-full h-full" />
                    </div>

                    <div className="flex-1 min-w-0 text-xs">
                      {isEditing ? (
                        <div className="flex items-center gap-1 mb-1">
                          <input
                            type="text"
                            value={editingBgName}
                            onChange={(e) => setEditingBgName(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-100 w-full focus:outline-none focus:border-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={async () => {
                              if (editingBgName.trim()) {
                                await updateUploadedBackground(bg.id, {
                                  name: editingBgName.trim(),
                                });
                              }
                              setEditingBgId(null);
                            }}
                            className="p-1 text-emerald-400 hover:bg-slate-700 rounded cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-semibold text-slate-200 truncate">{bg.name}</span>
                          {isActive && (
                            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded border border-emerald-500/30 shrink-0">
                              ACTIVE {selectedSideTab.toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                        <span>
                          {bg.originalWidthPx || 0} × {bg.originalHeightPx || 0} px
                        </span>
                        <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-slate-700/60 text-slate-300">
                          {selectedSideTab}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-700/50 text-xs">
                    <button
                      onClick={() => handleApplyBackground(bg)}
                      disabled={isActive}
                      className={`min-h-[32px] px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                        isActive
                          ? "bg-slate-800 text-slate-500 cursor-default"
                          : selectedSideTab === "front"
                          ? "bg-blue-600 hover:bg-blue-500 text-white"
                          : "bg-purple-600 hover:bg-purple-500 text-white"
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{isActive ? "Active on " + selectedSideTab : "Apply as " + selectedSideTab}</span>
                    </button>

                    <div className="flex items-center gap-1 text-slate-400">
                      <label
                        className="p-1.5 hover:bg-slate-700 rounded cursor-pointer hover:text-slate-200"
                        title="Replace Image File"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleReplaceBg(bg.id, e)}
                          className="hidden"
                        />
                      </label>

                      <button
                        onClick={() => {
                          setEditingBgId(bg.id);
                          setEditingBgName(bg.name);
                        }}
                        className="p-1.5 hover:bg-slate-700 rounded hover:text-slate-200 cursor-pointer"
                        title="Rename Background"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={async () => {
                          if (confirm(`Delete background "${bg.name}" from library?`)) {
                            await deleteUploadedBackground(bg.id);
                          }
                        }}
                        className="p-1.5 hover:bg-red-500/20 text-red-400 rounded cursor-pointer"
                        title="Delete Background"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
