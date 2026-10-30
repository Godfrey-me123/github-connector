import React, { useState, useRef } from "react";
import {
  X,
  FileUp,
  FileText,
  Loader2,
  CheckCircle2,
  Download,
  Printer,
  Eye,
  AlertCircle,
  FileCheck,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { convertDocxToPdf, DocxConversionResult } from "../../utils/docxToPdf";
import { saveDownloadRecordDB, DownloadRecord } from "../../utils/idb";
import { triggerUniversalDownload } from "../../utils/downloadHelper";

export interface DocxToPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPdf: (blob: Blob, fileName: string) => void;
}

export const DocxToPdfModal: React.FC<DocxToPdfModalProps> = ({
  isOpen,
  onClose,
  onOpenPdf,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionStatus, setConversionStatus] = useState<string>("");
  const [result, setResult] = useState<DocxConversionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSelectedFile(file);
    setResult(null);
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setIsConverting(true);
    setErrorMsg(null);
    setConversionStatus("Reading document file...");

    try {
      const convResult = await convertDocxToPdf(selectedFile, (status) => {
        setConversionStatus(status);
      });

      setResult(convResult);

      // Save to IndexedDB
      const record: DownloadRecord = {
        id: `doc_pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fileName: convResult.fileName,
        service: "DOC to PDF",
        format: "PDF",
        date: new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: Date.now(),
        dataUrl: URL.createObjectURL(convResult.blob),
        blobData: convResult.blob,
        status: "READY",
        sizeBytes: convResult.sizeBytes,
        pageCount: convResult.pageCount,
        lastModified: Date.now(),
      };

      await saveDownloadRecordDB(record);
      toast.success("Document converted to PDF successfully!");
    } catch (err: any) {
      console.error("Document conversion error:", err);
      setErrorMsg(
        err?.message ||
          "Failed to convert document. Please ensure the file is valid and not password-protected."
      );
      toast.error("Conversion failed.");
    } finally {
      setIsConverting(false);
      setConversionStatus("");
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    await triggerUniversalDownload({
      fileName: result.fileName,
      content: result.blob,
      mimeType: "application/pdf",
    });
    toast.success(`Downloaded: ${result.fileName}`);
  };

  const handlePrint = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {}
      }, 600);
    } else {
      window.print();
    }
  };

  const handlePreview = () => {
    if (!result) return;
    onOpenPdf(result.blob, result.fileName);
    onClose();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".doc,.docx,.txt,.rtf,.odt,.html,.htm,.md,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/html,text/markdown,text/rtf,application/rtf,*"
          className="hidden"
          id="doc-file-input"
        />

        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Open Doc File
              </h2>
              <p className="text-[11px] text-slate-500">
                Convert Word (.doc, .docx) &amp; any document on your computer or device
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
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-2xl flex items-start gap-2.5 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1">
                <p className="font-bold">Conversion Notice</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Initial State / File Selection */}
          {!result && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isConverting}
                className="w-full py-8 px-4 border-2 border-dashed border-blue-400 dark:border-blue-500/60 hover:border-blue-600 rounded-3xl bg-blue-50/40 dark:bg-blue-950/20 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileUp className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-black text-blue-600 dark:text-blue-400 block">
                    {selectedFile ? selectedFile.name : "Open Doc File"}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300 block font-bold">
                    {selectedFile
                      ? `${formatSize(selectedFile.size)} • Tap to change document`
                      : "Tap to open and fetch any document file on device or computer"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap justify-center gap-1.5 text-[10px] text-slate-400">
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 font-bold">
                    .DOCX / .DOC
                  </span>
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 font-bold">
                    .TXT / .MD
                  </span>
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 font-bold">
                    .RTF / .ODT
                  </span>
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 font-bold">
                    HTML Documents
                  </span>
                </div>
              </button>

              {/* Conversion Information */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <p className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Universal Document to PDF Engine:</span>
                </p>
                <p>
                  • Open any Word (.doc, .docx), Rich Text (.rtf), Plain Text (.txt), or Markdown (.md) document file.
                </p>
                <p>
                  • Converts formatting, tables, lists, and spacing into standard A4 PDF pages with 100% client-side privacy.
                </p>
              </div>
            </>
          )}

          {/* Conversion In Progress */}
          {isConverting && (
            <div className="py-8 text-center space-y-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 p-4">
              <Loader2 className="w-9 h-9 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {conversionStatus || "Processing document..."}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Rendering styled A4 PDF pages...
                </p>
              </div>
            </div>
          )}

          {/* Converted Success View */}
          {result && (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {result.fileName}
                  </p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Converted Successfully • {result.pageCount} page{result.pageCount !== 1 ? "s" : ""} • {formatSize(result.sizeBytes)}
                  </p>
                </div>
              </div>

              {/* Action Buttons for Result */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handlePreview}
                  className="py-3 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span>Open in PDF Reader</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-3 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            {result ? "Done" : "Cancel"}
          </button>

          {!result && (
            <button
              onClick={handleConvert}
              disabled={isConverting || !selectedFile}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Convert to PDF</span>
                </>
              )}
            </button>
          )}

          {result && (
            <button
              onClick={() => {
                setSelectedFile(null);
                setResult(null);
                fileInputRef.current?.click();
              }}
              className="px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Open Another Doc File
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
