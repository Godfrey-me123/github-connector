import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
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
  RefreshCw,
  HardDrive,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { convertDocxToPdf, DocxConversionResult } from "../utils/docxToPdf";
import { saveDownloadRecordDB, getAllDownloadRecordsDB, deleteDownloadRecordDB, DownloadRecord } from "../utils/idb";
import { useTemplateStore } from "../store/useTemplateStore";

export interface DocxToPdfScreenProps {
  onBack?: () => void;
}

export const DocxToPdfScreen: React.FC<DocxToPdfScreenProps> = ({ onBack }) => {
  const setActiveScreen = useTemplateStore((s) => s.setActiveScreen);
  const setActivePdf = useTemplateStore((s) => s.setActivePdf);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionStatus, setConversionStatus] = useState<string>("");
  const [result, setResult] = useState<DocxConversionResult | null>(null);
  const [latestRecord, setLatestRecord] = useState<DownloadRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recentDocs, setRecentDocs] = useState<DownloadRecord[]>([]);
  const [isLoadingRecents, setIsLoadingRecents] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setActiveScreen("home");
    }
  };

  const loadRecents = async () => {
    setIsLoadingRecents(true);
    try {
      const records = await getAllDownloadRecordsDB();
      const docs = records.filter(
        (r) =>
          r.service === "DOC to PDF" ||
          r.service === "DOCX to PDF" ||
          (r.fileName && r.fileName.toLowerCase().endsWith(".pdf"))
      );
      setRecentDocs(docs.slice(0, 10));
    } catch (e) {
      console.warn("Could not load recent docs:", e);
    } finally {
      setIsLoadingRecents(false);
    }
  };

  useEffect(() => {
    loadRecents();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSelectedFile(file);
    setResult(null);
    setLatestRecord(null);
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
        status: "COMPLETED",
        sizeBytes: convResult.sizeBytes,
        pageCount: convResult.pageCount,
        lastModified: Date.now(),
      };

      await saveDownloadRecordDB(record);
      setLatestRecord(record);
      await loadRecents();
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

  const handleOpenInViewer = (record?: DownloadRecord | null) => {
    const target = record || latestRecord;
    if (target) {
      setActivePdf(target);
      setActiveScreen("pdf_viewer");
    } else if (result) {
      const quickRecord: DownloadRecord = {
        id: `doc_pdf_${Date.now()}`,
        fileName: result.fileName,
        service: "DOC to PDF",
        format: "PDF",
        date: "Just now",
        timestamp: Date.now(),
        dataUrl: URL.createObjectURL(result.blob),
        blobData: result.blob,
        status: "COMPLETED",
        sizeBytes: result.sizeBytes,
        pageCount: result.pageCount,
        lastModified: Date.now(),
      };
      setActivePdf(quickRecord);
      setActiveScreen("pdf_viewer");
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".doc,.docx,.txt,.rtf,.odt,.html,.htm,.md,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/html,text/markdown,text/rtf,application/rtf,*"
        className="hidden"
        id="screen-doc-file-input"
      />

      {/* Top Header */}
      <div className="bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 sticky top-0 z-20 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                <FolderOpen className="w-4 h-4" />
              </div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
                Open Doc File
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveScreen("pdf_viewer")}
              className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
            >
              Go to PDF Reader
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Banner Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold text-white mb-1">
              <FileCheck className="w-3.5 h-3.5" />
              <span>Universal Document Converter</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Open Doc File
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
              Open and fetch any document file on your device or computer. Convert Word (.doc, .docx), Text (.txt, .md), and Rich Text into high-resolution, printable A4 PDF documents with 100% offline security.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl flex items-start gap-3 text-red-700 dark:text-red-300 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Conversion Notice</p>
              <p className="mt-0.5 text-xs leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* File Picker & Conversion Box */}
        <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          {!result ? (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isConverting}
                className="w-full py-12 px-6 border-2 border-dashed border-indigo-400 dark:border-indigo-500/60 hover:border-indigo-600 rounded-3xl bg-indigo-50/40 dark:bg-indigo-950/20 text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:scale-[1.005] group"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <FileUp className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 block">
                    {selectedFile ? selectedFile.name : "Open Doc File"}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 block font-bold">
                    {selectedFile
                      ? `${formatSize(selectedFile.size)} • Tap to select a different file`
                      : "Tap to open and fetch any document file on device or computer"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-2 text-[11px] text-slate-500">
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold">
                    .DOCX &amp; .DOC
                  </span>
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold">
                    .TXT &amp; .MD
                  </span>
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold">
                    .RTF &amp; .ODT
                  </span>
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold">
                    HTML Documents
                  </span>
                </div>
              </button>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-indigo-500" />
                  <span>Browse Device / Computer</span>
                </button>

                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={!selectedFile || isConverting}
                  className="w-full sm:w-auto px-7 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{conversionStatus || "Converting..."}</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Convert to PDF</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Conversion Result View */
            <div className="space-y-6">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                    {result.fileName}
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Converted Successfully • {result.pageCount} page{result.pageCount !== 1 ? "s" : ""} • {formatSize(result.sizeBytes)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenInViewer()}
                  className="py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Eye className="w-4 h-4" />
                  <span>Open in PDF Reader</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-3.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setResult(null);
                    setLatestRecord(null);
                    fileInputRef.current?.click();
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Convert Another Document File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Converted Documents from IndexedDB */}
        {recentDocs.length > 0 && (
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Recent Saved Documents
                </h3>
              </div>
              <button
                type="button"
                onClick={loadRecents}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRecents ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentDocs.map((rec) => (
                <div
                  key={rec.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {rec.fileName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {rec.date} • {formatSize(rec.sizeBytes)} • {rec.pageCount ? `${rec.pageCount} pages` : "PDF"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenInViewer(rec)}
                      className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Open in PDF Reader"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Open</span>
                    </button>
                    <a
                      href={rec.dataUrl}
                      download={rec.fileName}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
