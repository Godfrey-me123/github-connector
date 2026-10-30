import React, { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  LayoutGrid,
  ScrollText,
  CheckSquare,
  Square,
  Trash2,
  RotateCw,
  Move,
  Copy,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Download,
  Save,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { triggerUniversalDownload } from "../../utils/downloadHelper";

export interface PdfGridViewProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  rawPdfBytes: ArrayBuffer | null;
  fileName: string;
  activePageNumber: number;
  onJumpToPage: (pageNumber: number) => void;
  onSaveDocument: (newBlob: Blob, newFileName: string, newBytes: ArrayBuffer) => Promise<void>;
  onCloseGrid: () => void;
}

interface GridPageItem {
  id: string; // unique identifier
  originalIndex: number; // 0-based index in original PDF
  label: string;
  rotation: number; // 0, 90, 180, 270
}

export const PdfGridView: React.FC<PdfGridViewProps> = ({
  pdfDoc,
  rawPdfBytes,
  fileName,
  activePageNumber,
  onJumpToPage,
  onSaveDocument,
  onCloseGrid,
}) => {
  const [pages, setPages] = useState<GridPageItem[]>([]);
  const [originalPages, setOriginalPages] = useState<GridPageItem[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [isGeneratingThumbs, setIsGeneratingThumbs] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [gridSize, setGridSize] = useState<"sm" | "md" | "lg">("md");

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Multi-move modal/input
  const [showMoveModal, setShowMoveModal] = useState<boolean>(false);
  const [targetMovePos, setTargetMovePos] = useState<string>("");

  // Range select modal
  const [showRangeModal, setShowRangeModal] = useState<boolean>(false);
  const [rangeFrom, setRangeFrom] = useState<string>("1");
  const [rangeTo, setRangeTo] = useState<string>(String(pdfDoc.numPages));

  // Confirm delete modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [pagesToDelete, setPagesToDelete] = useState<string[]>([]);

  // Initialize pages and generate cached thumbnails from original PDF
  useEffect(() => {
    let isCancelled = false;

    const initPagesAndThumbs = async () => {
      const count = pdfDoc.numPages;
      const initial: GridPageItem[] = [];
      for (let i = 0; i < count; i++) {
        initial.push({
          id: `page_${i}_${Math.random().toString(36).substring(2, 6)}`,
          originalIndex: i,
          label: `Page ${i + 1}`,
          rotation: 0,
        });
      }
      setPages(initial);
      setOriginalPages(initial);
      setSelectedPages(new Set());

      setIsGeneratingThumbs(true);
      try {
        const thumbs: Record<number, string> = {};
        const limit = Math.min(count, 120);

        for (let i = 1; i <= limit; i++) {
          if (isCancelled) break;
          try {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.35 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            const ctx = canvas.getContext("2d", { alpha: false });
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport }).promise;
              thumbs[i - 1] = canvas.toDataURL("image/jpeg", 0.8);
            }
          } catch (e) {
            console.warn(`Thumbnail render error for page ${i}:`, e);
          }
        }
        if (!isCancelled) {
          setThumbnails(thumbs);
        }
      } catch (err) {
        console.warn("Could not generate page thumbnails in GridView:", err);
      } finally {
        if (!isCancelled) {
          setIsGeneratingThumbs(false);
        }
      }
    };

    initPagesAndThumbs();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc]);

  // Check if modified compared to original
  const isDirty =
    pages.length !== originalPages.length ||
    pages.some(
      (p, i) =>
        i >= originalPages.length ||
        p.originalIndex !== originalPages[i].originalIndex ||
        p.rotation !== originalPages[i].rotation
    );

  // Reorder single page
  const movePage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= pages.length || fromIdx === toIdx) return;
    setPages((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
  };

  // Selection helpers
  const toggleSelectPage = (id: string) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPages(new Set(pages.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedPages(new Set());
  };

  const invertSelection = () => {
    setSelectedPages((prev) => {
      const next = new Set<string>();
      pages.forEach((p) => {
        if (!prev.has(p.id)) next.add(p.id);
      });
      return next;
    });
  };

  const handleApplyRangeSelect = () => {
    const from = Math.max(1, parseInt(rangeFrom) || 1);
    const to = Math.min(pages.length, parseInt(rangeTo) || pages.length);
    if (from > to) {
      toast.error("Start page must be less than or equal to end page.");
      return;
    }

    const next = new Set(selectedPages);
    for (let i = from - 1; i <= to - 1; i++) {
      if (pages[i]) next.add(pages[i].id);
    }
    setSelectedPages(next);
    setShowRangeModal(false);
    toast.success(`Selected pages ${from} to ${to}`);
  };

  // Rotate selected pages (or single)
  const rotatePages = (targetIds: string[], degreesDelta: number = 90) => {
    setPages((prev) =>
      prev.map((p) => {
        if (targetIds.includes(p.id)) {
          return {
            ...p,
            rotation: (p.rotation + degreesDelta) % 360,
          };
        }
        return p;
      })
    );
    toast.success(`Rotated ${targetIds.length} page${targetIds.length > 1 ? "s" : ""}`);
  };

  // Duplicate selected pages
  const duplicateSelectedPages = () => {
    if (selectedPages.size === 0) return;
    setPages((prev) => {
      const newPages: GridPageItem[] = [];
      prev.forEach((p) => {
        newPages.push(p);
        if (selectedPages.has(p.id)) {
          newPages.push({
            ...p,
            id: `copy_${p.id}_${Math.random().toString(36).substring(2, 6)}`,
            label: `${p.label} (Copy)`,
          });
        }
      });
      return newPages;
    });
    toast.success(`Duplicated ${selectedPages.size} page${selectedPages.size > 1 ? "s" : ""}`);
  };

  // Delete pages
  const promptDeleteSelected = () => {
    if (selectedPages.size === 0) return;
    if (selectedPages.size >= pages.length) {
      toast.error("Cannot delete all pages. A PDF must contain at least 1 page.");
      return;
    }
    setPagesToDelete(Array.from(selectedPages));
    setShowDeleteConfirm(true);
  };

  const promptDeleteSingle = (id: string) => {
    if (pages.length <= 1) {
      toast.error("Cannot delete the only page in the document.");
      return;
    }
    setPagesToDelete([id]);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePages = () => {
    setPages((prev) => prev.filter((p) => !pagesToDelete.includes(p.id)));
    setSelectedPages((prev) => {
      const next = new Set(prev);
      pagesToDelete.forEach((id) => next.delete(id));
      return next;
    });
    setShowDeleteConfirm(false);
    toast.success(`Deleted ${pagesToDelete.length} page${pagesToDelete.length > 1 ? "s" : ""}`);
    setPagesToDelete([]);
  };

  // Move selected pages to target position
  const handleMoveSelected = () => {
    const pos = parseInt(targetMovePos);
    if (isNaN(pos) || pos < 1 || pos > pages.length) {
      toast.error(`Please enter a valid page number between 1 and ${pages.length}`);
      return;
    }

    const selectedIds = new Set(selectedPages);
    if (selectedIds.size === 0) return;

    setPages((prev) => {
      const targetIndex = pos - 1;
      const targetItem = prev[targetIndex];

      const movingItems = prev.filter((p) => selectedIds.has(p.id));
      const remainingItems = prev.filter((p) => !selectedIds.has(p.id));

      let newInsertIndex = remainingItems.indexOf(targetItem);
      if (newInsertIndex === -1) {
        newInsertIndex = Math.min(targetIndex, remainingItems.length);
      }

      remainingItems.splice(newInsertIndex, 0, ...movingItems);
      return remainingItems;
    });

    setShowMoveModal(false);
    setTargetMovePos("");
    toast.success(`Moved ${selectedPages.size} pages to position ${pos}`);
  };

  // Reset to original
  const handleReset = () => {
    setPages([...originalPages]);
    setSelectedPages(new Set());
    toast.info("Reset to original document order.");
  };

  // Compile and save changes
  const handleSaveDocument = async (downloadImmediately: boolean = false) => {
    if (!rawPdfBytes) {
      toast.error("PDF source data not available for export.");
      return;
    }
    if (pages.length === 0) {
      toast.error("Document has no pages to save.");
      return;
    }

    setIsSaving(true);
    try {
      const srcDoc = await PDFDocument.load(rawPdfBytes.slice(0), { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();

      const pageIndices = pages.map((p) => p.originalIndex);
      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);

      copiedPages.forEach((page, idx) => {
        const item = pages[idx];
        if (item.rotation) {
          const currentRot = page.getRotation().angle;
          page.setRotation(degrees((currentRot + item.rotation) % 360));
        }
        newDoc.addPage(page);
      });

      const newBytes = await newDoc.save();
      const newBlob = new Blob([newBytes], { type: "application/pdf" });

      const baseName = fileName.replace(/(_reordered\d*)*\.pdf$/i, "");
      const updatedFileName = `${baseName}_modified.pdf`;

      await onSaveDocument(newBlob, updatedFileName, newBytes.buffer);

      if (downloadImmediately) {
        await triggerUniversalDownload({
          fileName: updatedFileName,
          content: newBlob,
          mimeType: "application/pdf",
        });
        toast.success(`Saved and downloaded: ${updatedFileName}`);
      } else {
        toast.success("Document updated successfully!");
      }
    } catch (err: any) {
      console.error("Save PDF error:", err);
      toast.error(err?.message || "Failed to save PDF modifications.");
    } finally {
      setIsSaving(false);
    }
  };

  // Grid sizing classes
  const gridClasses = {
    sm: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3",
    md: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4",
    lg: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6",
  }[gridSize];

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900 min-h-[calc(100vh-140px)]">
      {/* =========================================================================
          GRID VIEW TOP CONTROLS & BATCH ACTIONS TOOLBAR
      ========================================================================== */}
      <div className="bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: View Mode Toggle & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onCloseGrid}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Switch back to continuous reading view"
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span>Reader View</span>
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-black bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs flex items-center gap-1.5"
                title="Current view: Thumbnail Grid Organizer"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid View</span>
              </button>
            </div>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                {pages.length} Pages
              </span>
              {isDirty && (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-black rounded-full border border-amber-300 dark:border-amber-800 animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
          </div>

          {/* Center / Right: Multi-Select Tools & Grid Size */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Grid Thumbnail Size Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setGridSize("sm")}
                className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                  gridSize === "sm"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Small thumbnails"
              >
                Small
              </button>
              <button
                type="button"
                onClick={() => setGridSize("md")}
                className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                  gridSize === "md"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Medium thumbnails"
              >
                Medium
              </button>
              <button
                type="button"
                onClick={() => setGridSize("lg")}
                className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                  gridSize === "lg"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Large thumbnails"
              >
                Large
              </button>
            </div>

            {/* Selection Quick Buttons */}
            <button
              type="button"
              onClick={selectedPages.size === pages.length ? deselectAll : selectAll}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              {selectedPages.size === pages.length ? (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                  <span>Select All ({pages.length})</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowRangeModal(true)}
              className="px-2 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              title="Select a range of pages"
            >
              Select Range...
            </button>

            {/* Save & Reset Actions */}
            {isDirty && (
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Discard reordering and revert"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSaveDocument(false)}
              disabled={isSaving || !isDirty}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
              title="Apply changes to viewer and saved document"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Apply Changes</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveDocument(true)}
              disabled={isSaving}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
              title="Save and download modified PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save &amp; Download</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            ACTIVE MULTI-PAGE SELECTION FLOATING BANNER
        ========================================================================== */}
        {selectedPages.size > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-black rounded-lg border border-purple-200 dark:border-purple-800">
                {selectedPages.size} Page{selectedPages.size !== 1 ? "s" : ""} Selected
              </span>
              <button
                type="button"
                onClick={invertSelection}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Invert
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Clear
              </button>
            </div>

            {/* Action Buttons for Selected Pages */}
            <div className="flex items-center gap-1.5">
              {/* Move Selected */}
              <button
                type="button"
                onClick={() => setShowMoveModal(true)}
                className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Move selected pages to target position"
              >
                <Move className="w-3.5 h-3.5" />
                <span>Move Selected</span>
              </button>

              {/* Rotate Selected */}
              <button
                type="button"
                onClick={() => rotatePages(Array.from(selectedPages), 90)}
                className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Rotate selected pages 90 degrees clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate 90°</span>
              </button>

              {/* Duplicate Selected */}
              <button
                type="button"
                onClick={duplicateSelectedPages}
                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Duplicate selected pages"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>

              {/* Delete Selected */}
              <button
                type="button"
                onClick={promptDeleteSelected}
                className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Remove selected pages from document"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete ({selectedPages.size})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SORTABLE THUMBNAIL GRID CONTAINER
      ========================================================================== */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {isGeneratingThumbs && Object.keys(thumbnails).length === 0 && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Generating page thumbnails...
              </p>
            </div>
          )}

          <div className={`grid ${gridClasses}`}>
            {pages.map((page, index) => {
              const isSelected = selectedPages.has(page.id);
              const isDragged = draggedIndex === index;
              const isDragOver = dragOverIndex === index;
              const thumbUrl = thumbnails[page.originalIndex];

              return (
                <div
                  key={page.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedIndex(index);
                    try {
                      e.dataTransfer.setData("text/plain", String(index));
                      e.dataTransfer.effectAllowed = "move";
                    } catch (err) {}
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverIndex !== index) {
                      setDragOverIndex(index);
                    }
                    try {
                      e.dataTransfer.dropEffect = "move";
                    } catch (err) {}
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === index) {
                      setDragOverIndex(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    let sourceIdx = draggedIndex;
                    try {
                      const dataStr = e.dataTransfer.getData("text/plain");
                      if (dataStr) sourceIdx = parseInt(dataStr, 10);
                    } catch (err) {}

                    if (sourceIdx !== null && !isNaN(sourceIdx) && sourceIdx !== index) {
                      movePage(sourceIdx, index);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDoubleClick={() => {
                    onJumpToPage(index + 1);
                    onCloseGrid();
                  }}
                  className={`group relative flex flex-col bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-200 select-none overflow-hidden ${
                    isSelected
                      ? "ring-2 ring-purple-500 border-purple-500 shadow-md bg-purple-50/20 dark:bg-purple-950/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs"
                  } ${isDragged ? "opacity-40 scale-95" : "opacity-100"} ${
                    isDragOver ? "ring-2 ring-blue-500 border-blue-500 scale-[1.02]" : ""
                  }`}
                >
                  {/* Card Header: Checkbox, Page Number Badge & Drag Grip */}
                  <div className="p-2 sm:p-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectPage(page.id);
                        }}
                        className="cursor-pointer text-slate-400 hover:text-purple-600 transition-colors"
                        title={isSelected ? "Deselect page" : "Select page"}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-600 fill-purple-100 dark:fill-purple-950" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 hover:text-purple-500" />
                        )}
                      </button>

                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                        Page {index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      {page.rotation > 0 && (
                        <span className="px-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded font-bold">
                          {page.rotation}°
                        </span>
                      )}
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        title="Drag to rearrange page position"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail Image Canvas Container */}
                  <div
                    onClick={() => toggleSelectPage(page.id)}
                    className="flex-1 p-2 flex items-center justify-center bg-slate-100 dark:bg-slate-900/50 cursor-pointer min-h-[140px] relative group/thumb overflow-hidden"
                  >
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={`Page ${index + 1}`}
                        style={{
                          transform: `rotate(${page.rotation}deg)`,
                          transition: "transform 0.2s ease",
                        }}
                        className="max-h-[180px] max-w-full object-contain rounded shadow-2xs border border-slate-200/80 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-20 h-28 bg-white dark:bg-slate-800 rounded border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        <span className="text-[9px]">Loading...</span>
                      </div>
                    )}

                    {/* Quick Hover Jump Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onJumpToPage(index + 1);
                        onCloseGrid();
                      }}
                      className="absolute inset-0 bg-black/40 backdrop-blur-2xs opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-xs font-bold cursor-pointer"
                      title="Double click or tap to read this page"
                    >
                      <Eye className="w-5 h-5" />
                      <span>View in Reader</span>
                    </button>
                  </div>

                  {/* Card Bottom Toolbar: Move left/right, Rotate, Delete, Jump */}
                  <div className="p-1.5 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-slate-500">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          movePage(index, index - 1);
                        }}
                        disabled={index === 0}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 rounded cursor-pointer"
                        title="Move Page Left"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          movePage(index, index + 1);
                        }}
                        disabled={index === pages.length - 1}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 rounded cursor-pointer"
                        title="Move Page Right"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          rotatePages([page.id], 90);
                        }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                        title="Rotate Page 90° Clockwise"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          promptDeleteSingle(page.id);
                        }}
                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 rounded cursor-pointer"
                        title="Delete Page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL: MOVE SELECTED PAGES TO POSITION
      ========================================================================== */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Move className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Move {selectedPages.size} Page{selectedPages.size > 1 ? "s" : ""}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the target position number (1 to {pages.length}) where you want to move the selected pages:
            </p>

            <input
              type="number"
              min={1}
              max={pages.length}
              value={targetMovePos}
              onChange={(e) => setTargetMovePos(e.target.value)}
              placeholder="e.g. 1 (beginning) or 5"
              autoFocus
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMoveSelected}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Move Pages
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: RANGE SELECTION
      ========================================================================== */}
      {showRangeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Select Page Range
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRangeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500">From Page</label>
                <input
                  type="number"
                  min={1}
                  max={pages.length}
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="w-full mt-1 py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500">To Page</label>
                <input
                  type="number"
                  min={1}
                  max={pages.length}
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="w-full mt-1 py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRangeModal(false)}
                className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyRangeSelect}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Select Pages
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRM DELETE PAGES
      ========================================================================== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Remove {pagesToDelete.length} Page{pagesToDelete.length > 1 ? "s" : ""}?
                </h3>
                <p className="text-xs text-slate-500">
                  This will remove the selected pages from the document.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePages}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
