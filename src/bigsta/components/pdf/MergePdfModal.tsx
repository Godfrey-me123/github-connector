import React, { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import {
  X,
  FileText,
  FileUp,
  Loader2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  CheckCircle2,
  Plus,
  GripVertical,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { triggerUniversalDownload } from "../../utils/downloadHelper";

export interface MergePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: { name: string; bytes?: ArrayBuffer | null; blob?: Blob | null } | null;
  onMerged?: (mergedBlob: Blob, fileName: string) => void;
}

interface SelectedPdf {
  id: string;
  file?: File;
  bytes?: ArrayBuffer;
  blob?: Blob;
  name: string;
  size: number;
}

export const MergePdfModal: React.FC<MergePdfModalProps> = ({
  isOpen,
  onClose,
  initialFile,
  onMerged,
}) => {
  const [files, setFiles] = useState<SelectedPdf[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [outputFileName, setOutputFileName] = useState("merged_document.pdf");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      return;
    }

    if (initialFile) {
      const sizeEstimate =
        initialFile.blob?.size || initialFile.bytes?.byteLength || 1024 * 50;
      setFiles([
        {
          id: `initial_${Date.now()}`,
          name: initialFile.name,
          bytes: initialFile.bytes || undefined,
          blob: initialFile.blob || undefined,
          size: sizeEstimate,
        },
      ]);
      setOutputFileName(
        initialFile.name.replace(/\.pdf$/i, "") + "_merged.pdf"
      );
    } else {
      setFiles([]);
      setOutputFileName("merged_document.pdf");
    }
  }, [isOpen, initialFile]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming: SelectedPdf[] = Array.from(e.target.files).map((f) => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file: f,
      name: f.name,
      size: f.size,
    }));
    setFiles((prev) => [...prev, ...incoming]);
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index >= files.length - 1) return;
    setFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= files.length || fromIndex === toIndex) return;
    setFiles((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  const handleMerge = async (triggerDownload = false) => {
    if (files.length < 2) {
      toast.error("Please add at least 2 PDF files to merge.");
      return;
    }

    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();

      let mergedPageCount = 0;

      for (const item of files) {
        let bytes: ArrayBuffer;
        if (item.bytes) {
          bytes = item.bytes;
        } else if (item.blob) {
          bytes = await item.blob.arrayBuffer();
        } else if (item.file) {
          bytes = await item.file.arrayBuffer();
        } else {
          continue;
        }

        const doc = await PDFDocument.load(bytes.slice(0), { ignoreEncryption: true });
        const pageIndices = doc.getPageIndices();
        if (pageIndices.length === 0) continue;
        const copiedPages = await mergedPdf.copyPages(doc, pageIndices);
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        mergedPageCount += copiedPages.length;
      }

      if (mergedPageCount === 0) {
        throw new Error("No readable pages were found in the selected PDF files.");
      }

      const mergedBytes = await mergedPdf.save();
      const cleanBuffer = mergedBytes.buffer.slice(
        mergedBytes.byteOffset,
        mergedBytes.byteOffset + mergedBytes.byteLength
      );
      const mergedBlob = new Blob([cleanBuffer], { type: "application/pdf" });

      const finalName = outputFileName.trim().toLowerCase().endsWith(".pdf")
        ? outputFileName.trim()
        : `${outputFileName.trim()}.pdf`;

      if (triggerDownload) {
        await triggerUniversalDownload({
          fileName: finalName,
          content: mergedBlob,
          mimeType: "application/pdf",
        });
      }

      if (onMerged) {
        onMerged(mergedBlob, finalName);
      }

      toast.success("PDFs merged successfully!");
      onClose();
    } catch (err: any) {
      console.error("PDF merge error:", err);
      toast.error(
        err?.message ||
          "Failed to merge PDF files. One or more files may be corrupt or encrypted."
      );
    } finally {
      setIsMerging(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Merge PDF Documents
              </h2>
              <p className="text-[10px] text-slate-500">
                {initialFile
                  ? `Merge additional files into ${initialFile.name}`
                  : "Combine multiple PDF files into one"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="application/pdf"
            multiple
            className="hidden"
          />

          {/* Add file button / dropzone */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-3 px-4 border-2 border-dashed border-blue-400 dark:border-blue-500/60 hover:border-blue-600 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 text-center flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                + Add PDF Files to Merge
              </span>
            </button>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Merge Sequence ({files.length} files)</span>
                <span className="text-[10px] text-slate-400">Drag or use arrows to adjust order</span>
              </div>

              <div className="space-y-1.5">
                {files.map((item, index) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggedIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedIndex !== null && draggedIndex !== index) {
                        moveItem(draggedIndex, index);
                      }
                      setDraggedIndex(null);
                    }}
                    className={`flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl gap-2 transition-all cursor-grab active:cursor-grabbing ${
                      draggedIndex === index ? "opacity-30 scale-98" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                      <span className="text-[10px] font-black w-4 text-center text-slate-400">
                        {index + 1}
                      </span>
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[170px] sm:max-w-xs">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400">{formatSize(item.size)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveUp(index);
                        }}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveDown(index);
                        }}
                        disabled={index === files.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(item.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output file name */}
          {files.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Merged File Name:
              </label>
              <input
                type="text"
                value={outputFileName}
                onChange={(e) => setOutputFileName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => handleMerge(false)}
            disabled={isMerging || files.length < 2}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            title="Merge documents and open directly in viewer"
          >
            {isMerging ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Merging...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Merge &amp; Open</span>
              </>
            )}
          </button>
          <button
            onClick={() => handleMerge(true)}
            disabled={isMerging || files.length < 2}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            title="Merge documents and immediately download the combined PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Merge &amp; Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
