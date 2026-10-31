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
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export interface PdfPageManagerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBytes?: ArrayBuffer | null;
  fileName?: string;
  currentPage?: number;
  onSave?: (newBlob: Blob, newFileName: string, newBytes: ArrayBuffer) => void;
}

interface PageItem {
  originalIndex: number;
  label: string;
}

export const PdfPageManager: React.FC<PdfPageManagerProps> = ({
  isOpen,
  onClose,
  pdfBytes,
  fileName = "document.pdf",
  currentPage = 1,
  onSave,
}) => {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rawPdfBytes, setRawPdfBytes] = useState<ArrayBuffer | null>(null);
  const [activeFileName, setActiveFileName] = useState<string>(fileName);

  // Inputs for specific page movement and deletion
  const [moveFromPageInput, setMoveFromPageInput] = useState<string>(String(currentPage || 1));
  const [moveToPageInput, setMoveToPageInput] = useState<string>("");
  const [deletePageInput, setDeletePageInput] = useState<string>("");

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate crisp thumbnails using PDF.js without detaching buffer
  const generateThumbnails = useCallback(async (bytes: ArrayBuffer, totalPages: number) => {
    try {
      const doc = await pdfjsLib.getDocument({
        data: bytes.slice(0),
        cMapUrl: "https://unpkg.com/pdfjs-dist@6.4.299/cmaps/",
        cMapPacked: true,
      }).promise;

      const thumbs: Record<number, string> = {};
      const limit = Math.min(totalPages, 80);

      for (let i = 1; i <= limit; i++) {
        try {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbs[i - 1] = canvas.toDataURL("image/jpeg", 0.75);
          }
        } catch (e) {}
      }
      setThumbnails(thumbs);
    } catch (err) {
      console.warn("Could not generate page thumbnails:", err);
    }
  }, []);

  const loadDocumentPages = useCallback(
    async (bytes: ArrayBuffer, name?: string) => {
      setIsLoading(true);
      try {
        const cleanBytes = bytes.slice(0);
        setRawPdfBytes(cleanBytes);
        if (name) setActiveFileName(name);

        const doc = await PDFDocument.load(cleanBytes.slice(0), { ignoreEncryption: true });
        const count = doc.getPageCount();

        const initialPages: PageItem[] = Array.from({ length: count }, (_, i) => ({
          originalIndex: i,
          label: `Page ${i + 1}`,
        }));

        setPages(initialPages);
        setSelectedForRemoval(new Set());
        setMoveFromPageInput(String(Math.min(currentPage || 1, count)));

        // Generate thumbnails
        generateThumbnails(cleanBytes, count);
      } catch (err: any) {
        console.error("Failed to load PDF pages in manager:", err);
        toast.error("Could not load PDF pages for management.");
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, generateThumbnails]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (pdfBytes && pdfBytes.byteLength > 0) {
      loadDocumentPages(pdfBytes, fileName);
    } else {
      setRawPdfBytes(null);
      setPages([]);
      setThumbnails({});
    }
  }, [isOpen, pdfBytes, fileName, loadDocumentPages]);

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const bytes = await file.arrayBuffer();
      await loadDocumentPages(bytes, file.name);
    } catch (err) {
      toast.error("Could not read uploaded PDF file.");
    }
    e.target.value = "";
  };

  if (!isOpen) return null;

  // Move page from one index to another
  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length || fromIndex === toIndex) return;
    setPages((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  // Specific page movement by inputs
  const handleSpecificMove = () => {
    const from = parseInt(moveFromPageInput.trim(), 10);
    const to = parseInt(moveToPageInput.trim(), 10);

    if (isNaN(from) || from < 1 || from > pages.length) {
      toast.error(`Invalid "From" page: enter a number between 1 and ${pages.length}.`);
      return;
    }

    if (isNaN(to) || to < 1 || to > pages.length) {
      toast.error(`Invalid "To" position: enter a number between 1 and ${pages.length}.`);
      return;
    }

    if (from === to) {
      toast.info("Page is already at that position.");
      return;
    }

    movePage(from - 1, to - 1);
    toast.success(`Moved Page ${from} to Position ${to}!`);
    setMoveFromPageInput(String(to));
    setMoveToPageInput("");
  };

  // Specific page deletion by input
  const handleSpecificDelete = () => {
    const pageNum = parseInt(deletePageInput.trim(), 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > pages.length) {
      toast.error(`Invalid page number: enter a number between 1 and ${pages.length}.`);
      return;
    }

    if (pages.length <= 1) {
      toast.error("Document must contain at least one page.");
      return;
    }

    const targetIndex = pageNum - 1;
    setPages((prev) => prev.filter((_, i) => i !== targetIndex));
    toast.success(`Page ${pageNum} removed from sequence.`);
    setDeletePageInput("");
  };

  const removePageCard = (index: number) => {
    if (pages.length <= 1) {
      toast.error("Document must contain at least one page.");
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
    toast.success(`Page ${index + 1} removed.`);
  };

  const resetOrder = async () => {
    if (!rawPdfBytes) return;
    try {
      const doc = await PDFDocument.load(rawPdfBytes.slice(0), { ignoreEncryption: true });
      const count = doc.getPageCount();
      setPages(
        Array.from({ length: count }, (_, i) => ({
          originalIndex: i,
          label: `Page ${i + 1}`,
        }))
      );
      toast.info("Page sequence reset to original.");
    } catch (e) {}
  };

  const handleSaveDocument = async (triggerDownload = false) => {
    if (!rawPdfBytes) {
      toast.error("No PDF loaded.");
      return;
    }

    if (pages.length === 0) {
      toast.error("At least one page must remain in the document.");
      return;
    }

    setIsSaving(true);
    try {
      const sourceDoc = await PDFDocument.load(rawPdfBytes.slice(0), { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();

      const pageIndices = pages.map((p) => p.originalIndex);
      const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices);
      copiedPages.forEach((p) => newDoc.addPage(p));

      const newBytes = await newDoc.save();
      const newBuffer = newBytes.buffer.slice(
        newBytes.byteOffset,
        newBytes.byteOffset + newBytes.byteLength
      );
      const newBlob = new Blob([newBuffer], { type: "application/pdf" });

      const finalName = activeFileName.replace(/(_reordered\d*)*\.pdf$/i, "") + "_reordered.pdf";

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

      if (onSave) {
        onSave(newBlob, finalName, newBuffer);
      }

      toast.success("PDF page order updated successfully!");
      onClose();
    } catch (err: any) {
      console.error("Save error in page manager:", err);
      toast.error("Failed to save reordered PDF.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFilePicked}
          accept="application/pdf"
          className="hidden"
        />

        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Move className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                Drag-and-Drop Page Manager
              </h2>
              <p className="text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-md">
                {activeFileName} • {pages.length} page{pages.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {rawPdfBytes && (
              <button
                type="button"
                onClick={resetOrder}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Reset to Original Sequence"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Controls Bar: Specific Movement & Deletion Inputs */}
        {rawPdfBytes && !isLoading && (
          <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Move Page Inputs */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Move Page:
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={pages.length}
                  value={moveFromPageInput}
                  onChange={(e) => setMoveFromPageInput(e.target.value)}
                  placeholder="Page #"
                  className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="number"
                  min={1}
                  max={pages.length}
                  value={moveToPageInput}
                  onChange={(e) => setMoveToPageInput(e.target.value)}
                  placeholder="Position #"
                  className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleSpecificMove}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <Move className="w-3.5 h-3.5" />
                  <span>Move</span>
                </button>
              </div>
            </div>

            {/* Delete Page Input */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                Delete:
              </span>
              <input
                type="number"
                min={1}
                max={pages.length}
                value={deletePageInput}
                onChange={(e) => setDeletePageInput(e.target.value)}
                placeholder="Page #"
                className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSpecificDelete}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Drag & Drop Thumbnails Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/50 dark:bg-slate-900/50">
          {!rawPdfBytes && !isLoading && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="py-16 px-6 border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 rounded-3xl bg-white dark:bg-slate-800 text-center flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all shadow-sm"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <FileUp className="w-7 h-7" />
              </div>
              <p className="text-sm font-black text-slate-800 dark:text-white">
                Choose a PDF to Reorder Pages
              </p>
              <p className="text-xs text-slate-500 max-w-sm">
                Drag pages to any position or use exact page number inputs to adjust the layout.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="py-20 text-center text-xs text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 dark:text-purple-400" />
              <p className="font-bold text-slate-700 dark:text-slate-300">
                Rendering visual page thumbnails...
              </p>
            </div>
          )}

          {rawPdfBytes && !isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {pages.map((item, index) => {
                const thumbUrl = thumbnails[item.originalIndex];
                const isBeingDragged = draggedIndex === index;
                const isDragOver = dragOverIndex === index;
                const isViewingThisPage = index + 1 === currentPage;

                return (
                  <div
                    key={`${item.originalIndex}_${index}`}
                    draggable
                    onDragStart={(e) => {
                      try {
                        e.dataTransfer.setData("text/plain", String(index));
                        e.dataTransfer.effectAllowed = "move";
                      } catch (err) {}
                      setDraggedIndex(index);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      try {
                        e.dataTransfer.dropEffect = "move";
                      } catch (err) {}
                      if (dragOverIndex !== index) setDragOverIndex(index);
                    }}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      let sourceIdx = draggedIndex;
                      if (sourceIdx === null) {
                        try {
                          const parsed = parseInt(e.dataTransfer.getData("text/plain"), 10);
                          if (!isNaN(parsed)) sourceIdx = parsed;
                        } catch (err) {}
                      }
                      if (sourceIdx !== null && sourceIdx !== index) {
                        movePage(sourceIdx, index);
                      }
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    className={`relative rounded-2xl p-2.5 flex flex-col items-center justify-between gap-2 shadow-2xs transition-all select-none cursor-grab active:cursor-grabbing ${
                      isBeingDragged ? "opacity-25 scale-95" : ""
                    } ${
                      isDragOver
                        ? "border-2 border-purple-600 ring-2 ring-purple-300 dark:ring-purple-900"
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400"
                    } ${isViewingThisPage ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""}`}
                  >
                    {/* Header of card: Page sequence number & delete icon */}
                    <div className="w-full flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[10px] font-black">
                          {index + 1}
                        </span>
                        {isViewingThisPage && (
                          <span className="text-[9px] font-black px-1 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded">
                            Active
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePageCard(index);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Delete this page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Thumbnail canvas / image */}
                    <div className="w-full aspect-[1/1.3] bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shadow-inner relative">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={`Page ${index + 1}`}
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                          <FileText className="w-8 h-8 mb-1 text-slate-300" />
                          <span className="text-[10px] font-bold">Page {index + 1}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Move Arrows */}
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
                        Pos #{index + 1}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {rawPdfBytes && (
          <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#1E293B]">
            <span className="text-xs text-slate-500 font-semibold">
              Total {pages.length} pages in sequence
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSaveDocument(false)}
                disabled={isSaving || pages.length === 0}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                title="Update pages in the viewer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apply &amp; Open in Viewer</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSaveDocument(true)}
                disabled={isSaving || pages.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                title="Apply changes and immediately download PDF"
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
