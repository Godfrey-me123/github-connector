import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  Search,
  FileText,
  ArrowLeft,
  Loader2,
  HardDrive,
  FileCheck,
  Download,
  Trash2,
  FileUp,
  RefreshCw,
  Eye,
  AlertCircle,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { useTemplateStore } from "../store/useTemplateStore";
import {
  DownloadRecord,
  getAllDownloadRecordsDB,
  saveDownloadRecordDB,
  deleteDownloadRecordDB,
} from "../utils/idb";
import { DocxToPdfModal } from "./pdf/DocxToPdfModal";
import { PdfThumbnailCard } from "./pdf/PdfThumbnailCard";

if (typeof window !== "undefined") {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch (err) {}
}

export const PdfLibraryScreen: React.FC = () => {
  const { setActiveScreen, setActivePdf } = useTemplateStore();
  const [pdfs, setPdfs] = useState<DownloadRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showDocxModal, setShowDocxModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"grid" | "list">("grid");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPdfs = async () => {
    try {
      const records = await getAllDownloadRecordsDB();
      setPdfs(
        records.filter(
          (r) =>
            r.format === "PDF" ||
            (r.fileName && r.fileName.toLowerCase().endsWith(".pdf")) ||
            r.service === "Imported PDF" ||
            r.service === "Modified PDF" ||
            r.service === "DOCX to PDF"
        )
      );
    } catch (err) {
      console.error("Failed to load PDFs:", err);
    }
  };

  useEffect(() => {
    loadPdfs();
  }, []);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error("File is too large (max 100 MB).");
      return;
    }

    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer.slice(0),
        cMapUrl: "https://unpkg.com/pdfjs-dist@6.4.299/cmaps/",
        cMapPacked: true,
      }).promise;

      const record: DownloadRecord = {
        id: `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fileName: file.name,
        service: "Imported PDF",
        format: "PDF",
        date: new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: Date.now(),
        dataUrl: URL.createObjectURL(file),
        blobData: file,
        status: "COMPLETED",
        sizeBytes: file.size,
        pageCount: pdf.numPages,
        lastModified: file.lastModified || Date.now(),
      };
      await saveDownloadRecordDB(record);
      setPdfs((prev) => [record, ...prev]);
      toast.success("PDF imported into library!");
    } catch (err: any) {
      console.error("PDF import error:", err);
      toast.error("Failed to parse PDF metadata.");
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (record: DownloadRecord) => {
    try {
      await deleteDownloadRecordDB(record.id);
      setPdfs((prev) => prev.filter((p) => p.id !== record.id));
      setDeletingId(null);
      toast.success(`Removed "${record.fileName}" from library.`);
    } catch (err) {
      toast.error("Failed to delete record.");
    }
  };

  const handleDownload = (record: DownloadRecord) => {
    if (record.blobData) {
      const url = URL.createObjectURL(record.blobData);
      const a = document.createElement("a");
      a.href = url;
      a.download = record.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded: ${record.fileName}`);
    } else if (record.dataUrl) {
      const a = document.createElement("a");
      a.href = record.dataUrl;
      a.download = record.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Downloaded: ${record.fileName}`);
    }
  };

  const filteredPdfs = pdfs.filter((p) =>
    (p.fileName || "").toLowerCase().includes(search.toLowerCase())
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-800 dark:text-slate-100 p-4 sm:p-6 flex flex-col font-sans transition-colors duration-200">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveScreen("home")}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
              title="Back to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                PDF Library
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage, convert Word documents, and view your local PDFs
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Word to PDF button */}
            <button
              type="button"
              onClick={() => setShowDocxModal(true)}
              className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
            >
              <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Open Doc File</span>
            </button>

            {/* Import PDF button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4" />
                  <span>Import PDF</span>
                </>
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept="application/pdf"
              className="hidden"
            />
          </div>
        </div>

        {/* Search & View Mode Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search documents by name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] text-slate-800 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden shadow-2xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewType("grid")}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewType === "grid"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
              title="Grid View (Thumbnails)"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-[11px]">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewType("list")}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewType === "list"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
              <span className="text-[11px]">List</span>
            </button>
          </div>
        </div>

        {/* PDF Items Grid or List */}
        <div className="flex-1">
          {filteredPdfs.length > 0 ? (
            viewType === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPdfs.map((pdf) => (
                  <PdfThumbnailCard
                    key={pdf.id}
                    pdf={pdf}
                    onOpen={(target) => {
                      useTemplateStore.setState({ activePdf: target });
                      setActiveScreen("pdf_viewer");
                    }}
                    onDownload={handleDownload}
                    onDelete={(target) => setDeletingId(target.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPdfs.map((pdf) => (
                  <div
                    key={pdf.id}
                    className="w-full p-4 bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xs hover:shadow-sm border border-slate-200 dark:border-slate-800 transition-all flex flex-wrap items-center justify-between gap-4"
                  >
                    {/* Item Details (clickable to open in reader) */}
                    <div
                      onClick={() => {
                        useTemplateStore.setState({ activePdf: pdf });
                        setActiveScreen("pdf_viewer");
                      }}
                      className="flex items-center gap-3.5 flex-1 min-w-[200px] cursor-pointer group"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs sm:text-sm truncate text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {pdf.fileName}
                          </p>
                          {pdf.service === "Modified PDF" && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded shrink-0">
                              Modified
                            </span>
                          )}
                          {pdf.service === "DOCX to PDF" && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded shrink-0">
                              DOCX Converted
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {pdf.pageCount && <span>{pdf.pageCount} pages •</span>}
                          <span>{formatFileSize(pdf.sizeBytes)}</span>
                          <span>• {pdf.lastModified ? new Date(pdf.lastModified).toLocaleDateString() : pdf.date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          useTemplateStore.setState({ activePdf: pdf });
                          setActiveScreen("pdf_viewer");
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownload(pdf)}
                        className="p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
                        title="Download a copy"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingId(pdf.id)}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Remove from library"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="bg-white dark:bg-[#1E293B] border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {search ? "No matching documents found" : "Your PDF Library is empty"}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Import any PDF document or convert a Word (.docx) file to view and read offline.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog before deleting from library */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Remove from Library?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This will remove the document entry from your browser library. The original file on your computer will remain completely untouched.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pdfs.find((p) => p.id === deletingId);
                  if (target) handleDelete(target);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Remove from Library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Docx To Pdf Modal */}
      {showDocxModal && (
        <DocxToPdfModal
          isOpen={showDocxModal}
          onClose={() => setShowDocxModal(false)}
          onOpenPdf={async (blob, name) => {
            const records = await getAllDownloadRecordsDB();
            const matchingRecord = records.find((p) => p.fileName === name);
            if (matchingRecord) {
              useTemplateStore.setState({ activePdf: matchingRecord });
            } else {
              const objectUrl = URL.createObjectURL(blob);
              useTemplateStore.setState({
                activePdf: {
                  id: `doc_pdf_open_${Date.now()}`,
                  fileName: name,
                  service: "DOCX to PDF",
                  format: "PDF",
                  date: new Date().toLocaleDateString(),
                  timestamp: Date.now(),
                  dataUrl: objectUrl,
                  blobData: blob,
                  status: "COMPLETED",
                  sizeBytes: blob.size,
                  lastModified: Date.now(),
                },
              });
            }
            setActiveScreen("pdf_viewer");
          }}
        />
      )}
    </div>
  );
};
