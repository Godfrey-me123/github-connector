import React, { useState, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import {
  X,
  FileText,
  Download,
  Loader2,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Move,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export interface RearrangePagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string | null;
  pdfBytes?: ArrayBuffer | null;
  fileName?: string;
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
  fileName = "rearranged.pdf",
  onSaved,
}) => {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rawPdfBytes, setRawPdfBytes] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadPages = async () => {
      setIsLoading(true);
      try {
        let bytes = pdfBytes;
        if (!bytes && pdfUrl) {
          const resp = await fetch(pdfUrl);
          bytes = await resp.arrayBuffer();
        }

        if (!bytes) {
          throw new Error("No PDF data provided to rearrange.");
        }

        setRawPdfBytes(bytes);
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const count = doc.getPageCount();

        const initialPages: PageItem[] = Array.from({ length: count }, (_, i) => ({
          originalIndex: i,
          label: `Page ${i + 1}`,
        }));
        setPages(initialPages);
      } catch (err: any) {
        console.error("Failed to load PDF pages for rearrangement:", err);
        toast.error("Could not load PDF pages for reordering.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPages();
  }, [isOpen, pdfUrl, pdfBytes]);

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

  const removePage = (index: number) => {
    if (pages.length <= 1) {
      toast.error("Document must contain at least one page.");
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
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
    } catch (e) {}
  };

  const handleSave = async () => {
    if (!rawPdfBytes || pages.length === 0) return;

    setIsSaving(true);
    try {
      const sourceDoc = await PDFDocument.load(rawPdfBytes, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();

      const pageIndices = pages.map((p) => p.originalIndex);
      const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices);
      copiedPages.forEach((p) => newDoc.addPage(p));

      const newBytes = await newDoc.save();
      const newBlob = new Blob([newBytes], { type: "application/pdf" });

      const finalName = fileName.replace(/\.pdf$/i, "") + "_rearranged.pdf";

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

      toast.success("Pages rearranged and saved!");
      onClose();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Failed to save rearranged PDF.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Move className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Rearrange / Reorder Pages
              </h2>
              <p className="text-[10px] text-slate-500">Change order or remove pages</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={resetOrder}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Reset Order"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
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
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
              Loading document pages...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {pages.map((item, index) => (
                <div
                  key={`${item.originalIndex}_${index}`}
                  className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3 flex flex-col items-center justify-between gap-2 shadow-2xs group hover:border-purple-400 transition-all"
                >
                  <div className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    <button
                      onClick={() => removePage(index)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-14 h-18 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-inner flex flex-col items-center justify-center p-1 text-center">
                    <FileText className="w-6 h-6 text-purple-500 mb-0.5" />
                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300">
                      {item.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 w-full justify-center pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <button
                      onClick={() => movePage(index, index - 1)}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                      title="Move Left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-slate-400">#{index + 1}</span>
                    <button
                      onClick={() => movePage(index, index + 1)}
                      disabled={index === pages.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                      title="Move Right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <span className="text-xs text-slate-500 font-medium">
            Total {pages.length} page{pages.length !== 1 ? "s" : ""}
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
              disabled={isSaving || pages.length === 0}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Pages</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
