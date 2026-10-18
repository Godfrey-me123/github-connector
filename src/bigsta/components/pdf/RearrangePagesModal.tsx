import React, { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
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
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rawPdfBytes, setRawPdfBytes] = useState<ArrayBuffer | null>(null);
  const [activeFileName, setActiveFileName] = useState<string>(fileName);
  const [mode, setMode] = useState<"rearrange" | "remove">(initialMode);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!isOpen) return;

    if (pdfBytes || pdfUrl) {
      loadFromBytesOrUrl(pdfBytes, pdfUrl, fileName);
    } else {
      setRawPdfBytes(null);
      setPages([]);
    }
  }, [isOpen, pdfUrl, pdfBytes, fileName]);

  const loadFromBytesOrUrl = async (bytes?: ArrayBuffer | null, url?: string | null, name?: string) => {
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
    } catch (err: any) {
      console.error("Failed to load PDF pages for rearrangement:", err);
      toast.error("Could not load PDF pages for reordering.");
    } finally {
      setIsLoading(false);
    }
  };

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

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    setPages((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

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
    setPages((prev) => prev.filter((_, i) => i !== index));
    toast.success("Page removed from list.");
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
    } catch (e) {}
  };

  const handleSave = async () => {
    if (!rawPdfBytes) {
      toast.error("No PDF loaded.");
      return;
    }

    // In remove mode, filter out selected pages
    const remainingPages = mode === "remove"
      ? pages.filter((p) => !selectedForRemoval.has(p.originalIndex))
      : pages;

    if (remainingPages.length === 0) {
      toast.error("At least one page must remain in the document.");
      return;
    }

    setIsSaving(true);
    try {
      const sourceDoc = await PDFDocument.load(rawPdfBytes, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();

      const pageIndices = remainingPages.map((p) => p.originalIndex);
      const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices);
      copiedPages.forEach((p) => newDoc.addPage(p));

      const newBytes = await newDoc.save();
      const newBlob = new Blob([newBytes], { type: "application/pdf" });

      const suffix = mode === "remove" ? "_modified.pdf" : "_rearranged.pdf";
      const finalName = activeFileName.replace(/\.pdf$/i, "") + suffix;

      if (onSaved) {
        onSaved(newBlob, finalName);
      } else {
        const url = URL.createObjectURL(newBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = finalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFilePicked}
          accept="application/pdf"
          className="hidden"
        />

        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                mode === "remove"
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                  : "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
              }`}
            >
              {mode === "remove" ? (
                <Scissors className="w-4 h-4" />
              ) : (
                <Move className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {mode === "remove" ? "Remove Pages from PDF" : "Rearrange / Reorder Pages"}
              </h2>
              <p className="text-[10px] text-slate-500 truncate max-w-[200px] sm:max-w-xs">
                {activeFileName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Toggle Mode button */}
            {rawPdfBytes && (
              <button
                onClick={() => setMode(mode === "rearrange" ? "remove" : "rearrange")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  mode === "remove"
                    ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                    : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                }`}
              >
                {mode === "remove" ? "Switch to Reorder" : "Switch to Remove"}
              </button>
            )}

            {rawPdfBytes && (
              <button
                onClick={resetOrder}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Reset to Original"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* If no PDF is loaded yet: display file selector */}
          {!rawPdfBytes && !isLoading && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="py-12 px-6 border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <FileUp className="w-10 h-10 text-purple-600 dark:text-purple-400" />
              <p className="text-xs font-bold text-slate-800 dark:text-white">
                Select a PDF to {mode === "remove" ? "Remove Pages" : "Rearrange"}
              </p>
              <p className="text-[10px] text-slate-500">
                Choose any PDF from your device to modify
              </p>
              <button
                type="button"
                className="mt-2 px-4 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-xs pointer-events-none"
              >
                Browse PDF File
              </button>
            </div>
          )}

          {isLoading && (
            <div className="py-12 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
              Loading document pages...
            </div>
          )}

          {rawPdfBytes && !isLoading && (
            <>
              {mode === "remove" ? (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                  <p className="font-bold flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    Tap pages to select them for removal:
                  </p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                    Selected pages will be permanently deleted when you click &quot;Remove Selected Pages&quot;.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 rounded-xl text-xs text-purple-700 dark:text-purple-300">
                  <p className="font-bold flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 shrink-0" />
                    Use Left / Right arrows to reorder pages:
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {pages.map((item, index) => {
                  const isMarkedForDelete = selectedForRemoval.has(item.originalIndex);

                  return (
                    <div
                      key={`${item.originalIndex}_${index}`}
                      onClick={() => {
                        if (mode === "remove") {
                          toggleSelectForRemoval(item.originalIndex);
                        }
                      }}
                      className={`relative rounded-2xl p-3 flex flex-col items-center justify-between gap-2 shadow-2xs transition-all ${
                        isMarkedForDelete
                          ? "bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-500 opacity-70 scale-95"
                          : "bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-purple-400"
                      } ${mode === "remove" ? "cursor-pointer" : ""}`}
                    >
                      {/* Top indicator & delete button */}
                      <div className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            isMarkedForDelete
                              ? "bg-rose-500 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {index + 1}
                        </span>

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
                          className={`p-1 rounded transition-colors ${
                            isMarkedForDelete
                              ? "text-rose-600 bg-rose-100 dark:bg-rose-900"
                              : "text-slate-400 hover:text-red-500"
                          }`}
                          title="Remove Page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Page Mock Preview */}
                      <div
                        className={`w-14 h-18 rounded-md shadow-inner flex flex-col items-center justify-center p-1 text-center transition-colors ${
                          isMarkedForDelete
                            ? "bg-rose-100 dark:bg-rose-900/50 border border-rose-300"
                            : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        <FileText
                          className={`w-6 h-6 mb-0.5 ${
                            isMarkedForDelete ? "text-rose-500" : "text-purple-500"
                          }`}
                        />
                        <span
                          className={`text-[9px] font-bold ${
                            isMarkedForDelete
                              ? "text-rose-600 line-through"
                              : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>

                      {/* Reorder arrows in rearrange mode */}
                      {mode === "rearrange" && (
                        <div className="flex items-center gap-1 w-full justify-center pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              movePage(index, index - 1);
                            }}
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                            title="Move Left"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] text-slate-400">#{index + 1}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              movePage(index, index + 1);
                            }}
                            disabled={index === pages.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                            title="Move Right"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Remove mode checkbox label */}
                      {mode === "remove" && (
                        <span
                          className={`text-[10px] font-bold ${
                            isMarkedForDelete ? "text-rose-600" : "text-slate-400"
                          }`}
                        >
                          {isMarkedForDelete ? "Will Delete" : "Keep"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {rawPdfBytes && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-xs text-slate-500 font-medium">
              {mode === "remove"
                ? `${selectedForRemoval.size} of ${pages.length} selected to remove`
                : `Total ${pages.length} page${pages.length !== 1 ? "s" : ""}`}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  isSaving ||
                  pages.length === 0 ||
                  (mode === "remove" && selectedForRemoval.size === 0)
                }
                className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer ${
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
                        ? `Remove (${selectedForRemoval.size}) & Save`
                        : "Save New Order"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
