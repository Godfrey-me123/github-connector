// @ts-nocheck -- PDF library typings are stricter than runtime; behaviour unchanged.
import React, { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  X,
  FileText,
  FileUp,
  Loader2,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Move,
  CheckCircle2,
  RefreshCw,
  Scissors,
  GripVertical,
  ArrowRightLeft,
  Download,
} from "lucide-react";
import { toast } from "sonner";

export interface RearrangePagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string | null;
  pdfBytes?: ArrayBuffer | null;
  fileName?: string;
  initialMode?: "rearrange" | "remove";
  onSaved?: (newBlob: Blob, fileName: string) => void;
}

interface PageItem {
  originalIndex: number;
  label: string;
}

export const RearrangePagesModal: React.FC<RearrangePagesModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  pdfBytes,
  fileName = "document.pdf",
  initialMode = "rearrange",
  onSaved,
}) => {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rawPdfBytes, setRawPdfBytes] = useState<ArrayBuffer | null>(null);
  const [activeFileName, setActiveFileName] = useState<string>(fileName);
  const [mode, setMode] = useState<"rearrange" | "remove">(initialMode);

  // Inputs for direct page manipulation by number
  const [removePageInput, setRemovePageInput] = useState<string>("");
  const [moveFromPageInput, setMoveFromPageInput] = useState<string>("");
  const [moveToPageInput, setMoveToPageInput] = useState<string>("");

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Load thumbnails using pdfjs
  const generateThumbnails = useCallback(async (bytes: ArrayBuffer, totalPages: number) => {
    try {
      const doc = await pdfjsLib.getDocument({
        data: bytes.slice(0),
        cMapUrl: "https://unpkg.com/pdfjs-dist@6.4.299/cmaps/",
        cMapPacked: true,
      }).promise;

      const thumbs: Record<number, string> = {};
      const limit = Math.min(totalPages, 60);

      for (let i = 1; i <= limit; i++) {
        try {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 0.28 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbs[i - 1] = canvas.toDataURL("image/jpeg", 0.7);
          }
        } catch (e) {}
      }
      setThumbnails(thumbs);
    } catch (err) {
      console.warn("Could not generate page thumbnails:", err);
    }
  }, []);

  const loadFromBytesOrUrl = useCallback(async (bytes?: ArrayBuffer | null, url?: string | null, name?: string) => {
    setIsLoading(true);
    try {
      let b = bytes;
      if (!b && url) {
        const resp = await fetch(url);
        b = await resp.arrayBuffer();
      }

      if (!b) return;

      setRawPdfBytes(b);
      if (name) setActiveFileName(name);

      const doc = await PDFDocument.load(b, { ignoreEncryption: true });
      const count = doc.getPageCount();

      const initialPages: PageItem[] = Array.from({ length: count }, (_, i) => ({
        originalIndex: i,
        label: `Page ${i + 1}`,
      }));
      setPages(initialPages);
      setSelectedForRemoval(new Set());

      // Generate visual page thumbnails
      generateThumbnails(b, count);
    } catch (err: any) {
      console.error("Failed to load PDF pages for rearrangement:", err);
      toast.error("Could not load PDF pages for reordering.");
    } finally {
      setIsLoading(false);
    }
  }, [generateThumbnails]);

  useEffect(() => {
    if (!isOpen) return;

    if (pdfBytes || pdfUrl) {
      loadFromBytesOrUrl(pdfBytes, pdfUrl, fileName);
    } else {
      setRawPdfBytes(null);
      setPages([]);
      setThumbnails({});
    }
  }, [isOpen, pdfUrl, pdfBytes, fileName, loadFromBytesOrUrl]);

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const bytes = await file.arrayBuffer();
      setActiveFileName(file.name);
      await loadFromBytesOrUrl(bytes, null, file.name);
    } catch (err) {
      toast.error("Could not read uploaded PDF file.");
      setIsLoading(false);
    }
    e.target.value = "";
  };

  if (!isOpen) return null;

  // Move page with arrows or drag-and-drop
  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length || fromIndex === toIndex) return;
    setPages((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  // Move page by entering page numbers explicitly
  const handleMoveByNumber = () => {
    const fromNum = parseInt(moveFromPageInput.trim(), 10);
    const toNum = parseInt(moveToPageInput.trim(), 10);

    if (isNaN(fromNum) || fromNum < 1 || fromNum > pages.length) {
      toast.error(`Invalid "From" page: enter a number between 1 and ${pages.length}.`);
      return;
    }

    if (isNaN(toNum) || toNum < 1 || toNum > pages.length) {
      toast.error(`Invalid "To" position: enter a number between 1 and ${pages.length}.`);
      return;
    }

    if (fromNum === toNum) {
      toast.info("Page is already at that position.");
      return;
    }

    movePage(fromNum - 1, toNum - 1);
    toast.success(`Moved Page ${fromNum} to position ${toNum}!`);
    setMoveFromPageInput("");
    setMoveToPageInput("");
  };

  // Remove page by entering page number explicitly
  const handleRemoveByNumber = () => {
    const pageNum = parseInt(removePageInput.trim(), 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > pages.length) {
      toast.error(`Invalid page number: enter a number between 1 and ${pages.length}.`);
      return;
    }

    if (pages.length <= 1) {
      toast.error("Document must contain at least one page.");
      return;
    }

    const targetIndex = pageNum - 1;
    const removedPage = pages[targetIndex];

    setPages((prev) => prev.filter((_, i) => i !== targetIndex));
    setSelectedForRemoval((prev) => {
      const next = new Set(prev);
      next.delete(removedPage.originalIndex);
      return next;
    });

    toast.success(`Removed Page ${pageNum} from document.`);
    setRemovePageInput("");
  };

  // Toggle select page for removal
  const toggleSelectForRemoval = (originalIndex: number) => {
    setSelectedForRemoval((prev) => {
      const next = new Set(prev);
      if (next.has(originalIndex)) {
        next.delete(originalIndex);
      } else {
        if (next.size >= pages.length - 1) {
          toast.error("You cannot delete all pages. At least 1 page must remain.");
          return prev;
        }
        next.add(originalIndex);
      }
      return next;
    });
  };

  const removePageImmediately = (index: number) => {
    if (pages.length <= 1) {
      toast.error("Document must contain at least one page.");
      return;
    }
    const pageItem = pages[index];
    setPages((prev) => prev.filter((_, i) => i !== index));
    setSelectedForRemoval((prev) => {
      const next = new Set(prev);
      next.delete(pageItem.originalIndex);
      return next;
    });
    toast.success(`Page ${index + 1} removed.`);
  };

  const resetOrder = async () => {
    if (!rawPdfBytes) return;
    try {
      const doc = await PDFDocument.load(rawPdfBytes, { ignoreEncryption: true });
      const count = doc.getPageCount();
      setPages(
        Array.from({ length: count }, (_, i) => ({
          originalIndex: i,
          label: `Page ${i + 1}`,
        }))
      );
      setSelectedForRemoval(new Set());
      toast.info("Reset to original sequence.");
    } catch (e) {}
  };

  // Save changes
  const handleSave = async (triggerDownload = false) => {
    if (!rawPdfBytes) {
      toast.error("No PDF loaded.");
      return;
    }

    const remainingPages =
      mode === "remove"
        ? pages.filter((p) => !selectedForRemoval.has(p.originalIndex))
        : pages;

    if (remainingPages.length === 0) {
      toast.error("At least one page must remain in the document.");
      return;
    }

    setIsSaving(true);
    try {
      const sourceDoc = await PDFDocument.load(rawPdfBytes.slice(0), { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();

      const pageIndices = remainingPages.map((p) => p.originalIndex);
      const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices);
      copiedPages.forEach((p) => newDoc.addPage(p));

      const newBytes = await newDoc.save();
      const newBuffer = newBytes.buffer.slice(
        newBytes.byteOffset,
        newBytes.byteOffset + newBytes.byteLength
      );
      const newBlob = new Blob([newBuffer], { type: "application/pdf" });

      const suffix = mode === "remove" ? "_modified.pdf" : "_rearranged.pdf";
      const finalName = activeFileName.replace(/\.pdf$/i, "") + suffix;

      if (triggerDownload) {
        const url = URL.createObjectURL(newBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = finalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      if (onSaved) {
        onSaved(newBlob, finalName);
      }

      toast.success(
        mode === "remove"
          ? `${selectedForRemoval.size} page(s) removed successfully!`
          : "Pages rearranged and saved!"
      );
      onClose();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Failed to save modified PDF.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFilePicked}
          accept="application/pdf"
          className="hidden"
        />

        {/* Modal Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                mode === "remove"
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                  : "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
              }`}
            >
              {mode === "remove" ? (
                <Scissors className="w-5 h-5" />
              ) : (
                <Move className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                {mode === "remove" ? "Remove Pages from PDF" : "Rearrange Pages in PDF"}
              </h2>
              <p className="text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-md">
                {activeFileName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {rawPdfBytes && (
              <button
                onClick={() => setMode(mode === "rearrange" ? "remove" : "rearrange")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  mode === "remove"
                    ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                    : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                }`}
              >
                {mode === "remove" ? "Switch to Rearrange" : "Switch to Remove"}
              </button>
            )}

            {rawPdfBytes && (
              <button
                onClick={resetOrder}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Reset to Original Order"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar: Insert Page Numbers to Move or Remove */}
        {rawPdfBytes && !isLoading && (
          <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            {mode === "remove" ? (
              /* Remove by entering page number */
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5 text-rose-500" />
                  Remove by Page #:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={pages.length}
                    value={removePageInput}
                    onChange={(e) => setRemovePageInput(e.target.value)}
                    placeholder={`1 - ${pages.length}`}
                    className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                  <button
                    onClick={handleRemoveByNumber}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Page</span>
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 hidden md:inline">
                  (Or tap any page below to toggle delete)
                </span>
              </div>
            ) : (
              /* Rearrange by entering page number to move */
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-purple-500" />
                  Move Page #:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={pages.length}
                    value={moveFromPageInput}
                    onChange={(e) => setMoveFromPageInput(e.target.value)}
                    placeholder="Page #"
                    className="w-20 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                  <span className="text-slate-400 font-bold">to</span>
                  <input
                    type="number"
                    min={1}
                    max={pages.length}
                    value={moveToPageInput}
                    onChange={(e) => setMoveToPageInput(e.target.value)}
                    placeholder="Position #"
                    className="w-22 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                  <button
                    onClick={handleMoveByNumber}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                  >
                    <Move className="w-3.5 h-3.5" />
                    <span>Move</span>
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 hidden md:inline">
                  (Or drag cards or use arrows below)
                </span>
              </div>
            )}

            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Total {pages.length} Pages
            </div>
          </div>
        )}

        {/* Modal Scrollable Page Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/50 dark:bg-slate-900/50">
          {/* File Picker Fallback if no PDF was provided */}
          {!rawPdfBytes && !isLoading && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="py-14 px-6 border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 rounded-3xl bg-white dark:bg-slate-800 text-center flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all shadow-sm"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <FileUp className="w-7 h-7" />
              </div>
              <p className="text-sm font-black text-slate-800 dark:text-white">
                Select a PDF to {mode === "remove" ? "Remove Pages" : "Rearrange"}
              </p>
              <p className="text-xs text-slate-500 max-w-sm">
                Choose any PDF from your device to visually reorder pages or delete unwanted pages.
              </p>
              <button
                type="button"
                className="mt-2 px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-sm pointer-events-none"
              >
                Browse PDF File
              </button>
            </div>
          )}

          {isLoading && (
            <div className="py-16 text-center text-xs text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
              <p className="font-bold text-slate-600 dark:text-slate-300">
                Rendering visual page thumbnails...
              </p>
            </div>
          )}

          {rawPdfBytes && !isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {pages.map((item, index) => {
                const isMarkedForDelete = selectedForRemoval.has(item.originalIndex);
                const thumbUrl = thumbnails[item.originalIndex];
                const isBeingDragged = draggedIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <div
                    key={`${item.originalIndex}_${index}`}
                    draggable={mode === "rearrange"}
                    onDragStart={() => setDraggedIndex(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverIndex !== index) setDragOverIndex(index);
                    }}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDrop={() => {
                      if (draggedIndex !== null && draggedIndex !== index) {
                        movePage(draggedIndex, index);
                      }
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    onClick={() => {
                      if (mode === "remove") {
                        toggleSelectForRemoval(item.originalIndex);
                      }
                    }}
                    className={`relative rounded-2xl p-2.5 flex flex-col items-center justify-between gap-2 shadow-2xs transition-all select-none ${
                      isBeingDragged ? "opacity-30 scale-95" : ""
                    } ${isDragOver ? "border-2 border-purple-600 ring-2 ring-purple-300" : ""} ${
                      isMarkedForDelete
                        ? "bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-500 opacity-75"
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400"
                    } ${mode === "remove" ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
                  >
                    {/* Top Row: Page number badge & delete icon */}
                    <div className="w-full flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-1">
                        {mode === "rearrange" && (
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                        )}
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            isMarkedForDelete
                              ? "bg-rose-500 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {index + 1}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (mode === "remove") {
                            toggleSelectForRemoval(item.originalIndex);
                          } else {
                            removePageImmediately(index);
                          }
                        }}
                        className={`p-1 rounded-md transition-colors ${
                          isMarkedForDelete
                            ? "text-rose-600 bg-rose-100 dark:bg-rose-900"
                            : "text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                        title="Delete Page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Actual Visual Page Thumbnail */}
                    <div className="w-full aspect-[1/1.3] bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center relative shadow-inner">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={`Page ${index + 1}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                          <FileText className="w-8 h-8 mb-1 text-slate-300" />
                          <span className="text-[10px] font-bold">Page {index + 1}</span>
                        </div>
                      )}

                      {/* Overlaid delete banner in remove mode */}
                      {isMarkedForDelete && (
                        <div className="absolute inset-0 bg-rose-500/25 flex items-center justify-center backdrop-blur-[0.5px]">
                          <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                            Will Delete
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Reorder Arrows in rearrange mode */}
                    {mode === "rearrange" && (
                      <div className="flex items-center gap-1 w-full justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            movePage(index, index - 1);
                          }}
                          disabled={index === 0}
                          className="p-1 text-slate-500 hover:text-purple-600 dark:text-slate-400 disabled:opacity-20 cursor-pointer"
                          title="Move Left"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-bold text-slate-400">
                          Pos {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            movePage(index, index + 1);
                          }}
                          disabled={index === pages.length - 1}
                          className="p-1 text-slate-500 hover:text-purple-600 dark:text-slate-400 disabled:opacity-20 cursor-pointer"
                          title="Move Right"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Label in remove mode */}
                    {mode === "remove" && (
                      <span
                        className={`text-[10px] font-bold pt-1 ${
                          isMarkedForDelete ? "text-rose-600" : "text-slate-400"
                        }`}
                      >
                        {isMarkedForDelete ? "Tap to keep" : "Tap to delete"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        {rawPdfBytes && (
          <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#1E293B]">
            <span className="text-xs text-slate-500 font-semibold">
              {mode === "remove"
                ? `${selectedForRemoval.size} of ${pages.length} selected to remove`
                : `${pages.length} pages total in sequence`}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={
                  isSaving ||
                  pages.length === 0 ||
                  (mode === "remove" && selectedForRemoval.size === 0)
                }
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer ${
                  mode === "remove"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {mode === "remove"
                        ? `Save (${selectedForRemoval.size} Removed)`
                        : "Save New Order"}
                    </span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={
                  isSaving ||
                  pages.length === 0 ||
                  (mode === "remove" && selectedForRemoval.size === 0)
                }
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                title="Save changes and immediately download the modified PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save &amp; Download</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
