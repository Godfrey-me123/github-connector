import React, { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument } from "pdf-lib";
import {
  FileUp,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Printer,
  Download,
  FileText,
  ArrowLeft,
  Loader2,
  Search,
  Trash2,
  Maximize2,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  FolderOpen,
  Info,
  Layers,
  Move,
  Scissors,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useTemplateStore } from "../store/useTemplateStore";
import {
  DownloadRecord,
  getAllDownloadRecordsDB,
  saveDownloadRecordDB,
  deleteDownloadRecordDB,
} from "../utils/idb";
import { MergePdfModal } from "./pdf/MergePdfModal";
import { RearrangePagesModal } from "./pdf/RearrangePagesModal";

// Initialize worker safely from local bundled asset for 100% offline support
if (typeof window !== "undefined") {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch (err) {
    console.warn("PDF worker assignment warning:", err);
  }
}

export const PDFViewerScreen: React.FC = () => {
  const { setActiveScreen, activePdf, setActivePdf } = useTemplateStore();

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentFileTitle, setCurrentFileTitle] = useState<string>("document.pdf");
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [fitToWidth, setFitToWidth] = useState<boolean>(true);

  // In-memory raw bytes for instant page manipulation (remove, merge, rearrange)
  const [rawPdfBytes, setRawPdfBytes] = useState<ArrayBuffer | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMsg, setLoadingMsg] = useState<string>("Loading PDF...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Recents list
  const [recentPdfs, setRecentPdfs] = useState<DownloadRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoadingRecents, setIsLoadingRecents] = useState<boolean>(true);

  // Modals state
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showMergeModal, setShowMergeModal] = useState<boolean>(false);
  const [showRearrangeModal, setShowRearrangeModal] = useState<boolean>(false);
  const [rearrangeMode, setRearrangeMode] = useState<"rearrange" | "remove">("rearrange");
  const [customSaveName, setCustomSaveName] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Load recent PDFs from IndexedDB
  const refreshRecentPdfs = useCallback(async () => {
    try {
      setIsLoadingRecents(true);
      const allRecords = await getAllDownloadRecordsDB();
      const pdfs = allRecords.filter(
        (r) =>
          r.format === "PDF" ||
          (r.fileName && r.fileName.toLowerCase().endsWith(".pdf")) ||
          r.service === "Imported PDF" ||
          r.service === "Modified PDF"
      );
      setRecentPdfs(pdfs);
    } catch (err) {
      console.error("Failed to load recent PDFs from IndexedDB:", err);
    } finally {
      setIsLoadingRecents(false);
    }
  }, []);

  useEffect(() => {
    refreshRecentPdfs();
  }, [refreshRecentPdfs]);

  // Load document from activePdf in store if available
  useEffect(() => {
    if (activePdf) {
      loadDocumentFromRecord(activePdf);
    }
  }, [activePdf]);

  const loadDocumentFromRecord = async (record: DownloadRecord) => {
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingMsg("Opening document...");
    setCurrentFileTitle(record.fileName || "document.pdf");
    setCustomSaveName(record.fileName || "document.pdf");

    const timeoutTimer = setTimeout(() => {
      setIsLoading((loading) => {
        if (loading) {
          setErrorMsg("Loading took longer than expected. The document may be very large or protected.");
        }
        return false;
      });
    }, 15000);

    try {
      let arrayBuffer: ArrayBuffer;

      if (record.blobData) {
        arrayBuffer = await record.blobData.arrayBuffer();
        setPdfUrl(URL.createObjectURL(record.blobData));
      } else if (record.dataUrl.startsWith("data:")) {
        const base64Data = record.dataUrl.split(",")[1];
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
        setPdfUrl(record.dataUrl);
      } else {
        const resp = await fetch(record.dataUrl);
        if (!resp.ok) throw new Error("Could not read document data from storage.");
        const blob = await resp.blob();
        arrayBuffer = await blob.arrayBuffer();
        setPdfUrl(URL.createObjectURL(blob));
      }

      setRawPdfBytes(arrayBuffer);

      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: "https://unpkg.com/pdfjs-dist@6.4.299/cmaps/",
        cMapPacked: true,
      });

      const doc = await loadingTask.promise;
      clearTimeout(timeoutTimer);
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setPageNumber(1);
      setRotation(0);
      setFitToWidth(true);
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      console.error("PDF loading error:", err);
      setErrorMsg(err?.message || "Failed to parse PDF document. It may be corrupt or encrypted.");
      toast.error("Failed to open PDF document.");
    } finally {
      clearTimeout(timeoutTimer);
      setIsLoading(false);
    }
  };

  // Open / Import a file chosen directly by user
  const handleFilePicked = async (file: File | Blob, customName?: string) => {
    if (!file) return;

    const actualName = customName || (file as File).name || "document.pdf";

    if (file.size > 100 * 1024 * 1024) {
      toast.error("File is too large (maximum limit is 100 MB).");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setLoadingMsg("Processing PDF...");
    setCurrentFileTitle(actualName);
    setCustomSaveName(actualName);

    const timeoutTimer = setTimeout(() => {
      setIsLoading((loading) => {
        if (loading) {
          setErrorMsg("Loading took longer than expected. Please check if the file is supported.");
        }
        return false;
      });
    }, 15000);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const objectUrl = URL.createObjectURL(file);
      setPdfUrl(objectUrl);
      setRawPdfBytes(arrayBuffer);

      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: "https://unpkg.com/pdfjs-dist@6.4.299/cmaps/",
        cMapPacked: true,
      });

      const doc = await loadingTask.promise;
      clearTimeout(timeoutTimer);

      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setPageNumber(1);
      setRotation(0);
      setFitToWidth(true);

      // Save directly to IndexedDB with native blobData for instant, offline recents access
      const newRecord: DownloadRecord = {
        id: `pdf_recent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fileName: actualName,
        service: "Imported PDF",
        format: "PDF",
        date: new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: Date.now(),
        dataUrl: objectUrl,
        blobData: file,
        status: "COMPLETED",
        sizeBytes: file.size,
        pageCount: doc.numPages,
        lastModified: Date.now(),
      };

      await saveDownloadRecordDB(newRecord);
      refreshRecentPdfs();
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      console.error("PDF parse error:", err);
      setErrorMsg(err?.message || "Failed to open PDF file. Please ensure it is a valid PDF.");
      toast.error("Could not read PDF file.");
    } finally {
      clearTimeout(timeoutTimer);
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFilePicked(file);
    }
    e.target.value = "";
  };

  // Render active page to canvas with high-DPI and fit-to-width support
  useEffect(() => {
    if (!pdfDoc) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return;

        // Cancel any currently running render task
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {}
          renderTaskRef.current = null;
        }

        // Calculate fit-to-width scale if enabled
        let effectiveScale = scale;
        if (fitToWidth && containerRef.current) {
          const containerWidth = containerRef.current.clientWidth - 32;
          const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
          if (containerWidth > 0 && unscaledViewport.width > 0) {
            const fitScale = containerWidth / unscaledViewport.width;
            effectiveScale = Math.min(Math.max(fitScale, 0.4), 3.0);
          }
        }

        const viewport = page.getViewport({ scale: effectiveScale, rotation });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.warn("Page render issue:", err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
      }
    };
  }, [pdfDoc, pageNumber, scale, rotation, fitToWidth]);

  // Clean close of current document to return to centered Open/Recents view
  const handleCloseDocument = () => {
    setPdfDoc(null);
    setPdfUrl(null);
    setRawPdfBytes(null);
    setErrorMsg(null);
    if (activePdf) {
      setActivePdf(null);
    }
  };

  // Delete a recent item from IndexedDB
  const handleDeleteRecent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDownloadRecordDB(id);
      setRecentPdfs((prev) => prev.filter((item) => item.id !== id));
      toast.success("Removed from recents.");
    } catch (err) {
      toast.error("Could not remove item.");
    }
  };

  // Instant in-place removal of the currently viewed page
  const handleRemoveCurrentPage = async () => {
    if (!rawPdfBytes) {
      toast.error("No document loaded.");
      return;
    }

    if (numPages <= 1) {
      toast.error("Cannot remove page: document must contain at least one page.");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete Page ${pageNumber} of ${numPages} from this document?`
    );
    if (!confirmDelete) return;

    setIsLoading(true);
    setLoadingMsg(`Removing Page ${pageNumber}...`);

    try {
      const sourceDoc = await PDFDocument.load(rawPdfBytes, { ignoreEncryption: true });
      sourceDoc.removePage(pageNumber - 1);

      const newBytes = await sourceDoc.save();
      const newBlob = new Blob([newBytes], { type: "application/pdf" });

      const newDoc = await pdfjsLib.getDocument({
        data: newBytes,
        cMapUrl: "https://unpkg.com/pdfjs-dist@6.4.299/cmaps/",
        cMapPacked: true,
      }).promise;

      setRawPdfBytes(newBytes);
      setPdfDoc(newDoc);
      setPdfUrl(URL.createObjectURL(newBlob));
      setNumPages(newDoc.numPages);
      setPageNumber((p) => Math.min(p, newDoc.numPages));

      // Save updated document to IndexedDB
      const updatedRecord: DownloadRecord = {
        id: `pdf_mod_${Date.now()}`,
        fileName: currentFileTitle,
        service: "Modified PDF",
        format: "PDF",
        date: new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: Date.now(),
        dataUrl: URL.createObjectURL(newBlob),
        blobData: newBlob,
        status: "COMPLETED",
        sizeBytes: newBlob.size,
        pageCount: newDoc.numPages,
        lastModified: Date.now(),
      };

      await saveDownloadRecordDB(updatedRecord);
      refreshRecentPdfs();

      toast.success(`Page ${pageNumber} removed successfully!`);
    } catch (err: any) {
      console.error("Remove page error:", err);
      toast.error("Failed to remove page from document.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle native print
  const handleTriggerPrint = () => {
    if (!pdfUrl) {
      toast.error("No document available to print.");
      return;
    }

    try {
      const printWindow = window.open(pdfUrl, "_blank");
      if (printWindow) {
        printWindow.focus();
        setTimeout(() => {
          try {
            printWindow.print();
          } catch (e) {}
        }, 600);
        toast.success("Opening system print dialog...");
      } else {
        window.print();
      }
    } catch (err) {
      window.print();
    }
    setShowPrintModal(false);
  };

  // Handle file download / save copy
  const handleDownloadCopy = () => {
    if (!pdfUrl) return;
    const finalName = customSaveName.trim()
      ? customSaveName.trim().endsWith(".pdf")
        ? customSaveName.trim()
        : `${customSaveName.trim()}.pdf`
      : currentFileTitle;

    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Saved copy as: ${finalName}`);
    setShowPrintModal(false);
  };

  // Filter recents
  const filteredRecents = recentPdfs.filter((p) =>
    (p.fileName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept="application/pdf"
        className="hidden"
        id="pdf-global-upload-input"
      />

      {/* =========================================================================
          VIEW 1: NO PDF OPEN - PROMINENT TOOLS GRID, CENTERED IMPORT & RECENT FILES
      ========================================================================== */}
      {!pdfDoc && !isLoading && (
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 sticky top-0 z-20 shadow-xs">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <button
                onClick={() => setActiveScreen("home")}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
                  PDF & Print Studio
                </span>
              </div>
            </div>
          </div>

          {/* Centered Main Area */}
          <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
            {/* Error Banner if any */}
            {errorMsg && (
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-2xl flex items-start gap-3 text-red-700 dark:text-red-300 animate-in fade-in">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <div className="flex-1 text-xs">
                  <p className="font-bold">Notice</p>
                  <p className="mt-0.5">{errorMsg}</p>
                </div>
                <button
                  onClick={() => setErrorMsg(null)}
                  className="text-xs text-red-500 hover:underline font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* 1. PROMINENT PDF TOOLS ACTION GRID - VISIBLE BEFORE OPENING ANY FILE */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  PDF Quick Tools
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Select a tool or tap to open
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Tool 1: Open / View */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 bg-white dark:bg-[#1E293B] hover:bg-blue-50/60 dark:hover:bg-blue-950/30 border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-2xl text-left transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between gap-3 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      Open & View PDF
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      Read, inspect, and native print
                    </p>
                  </div>
                </button>

                {/* Tool 2: Merge PDFs */}
                <button
                  type="button"
                  onClick={() => setShowMergeModal(true)}
                  className="p-4 bg-white dark:bg-[#1E293B] hover:bg-blue-50/60 dark:hover:bg-blue-950/30 border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-2xl text-left transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between gap-3 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      Merge PDFs
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      Combine 2+ documents into 1
                    </p>
                  </div>
                </button>

                {/* Tool 3: Rearrange Pages */}
                <button
                  type="button"
                  onClick={() => {
                    setRearrangeMode("rearrange");
                    setShowRearrangeModal(true);
                  }}
                  className="p-4 bg-white dark:bg-[#1E293B] hover:bg-purple-50/60 dark:hover:bg-purple-950/30 border-2 border-slate-200 dark:border-slate-800 hover:border-purple-500 rounded-2xl text-left transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between gap-3 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Move className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                      Rearrange Pages
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      Change sequence of pages
                    </p>
                  </div>
                </button>

                {/* Tool 4: Remove Page */}
                <button
                  type="button"
                  onClick={() => {
                    setRearrangeMode("remove");
                    setShowRearrangeModal(true);
                  }}
                  className="p-4 bg-white dark:bg-[#1E293B] hover:bg-rose-50/60 dark:hover:bg-rose-950/30 border-2 border-slate-200 dark:border-slate-800 hover:border-rose-500 rounded-2xl text-left transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between gap-3 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400">
                      Remove Page(s)
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      Delete unwanted pages
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. CENTERED SIMPLIFIED IMPORT DROPZONE */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer bg-white dark:bg-[#1E293B] border-2 border-dashed border-blue-400 dark:border-blue-500/60 hover:border-blue-600 dark:hover:border-blue-400 rounded-3xl p-6 sm:p-10 text-center shadow-sm hover:shadow-md transition-all active:scale-[0.99] flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-950/60 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner group-hover:scale-105 transition-transform duration-200">
                <FileUp className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Tap to Open / Import PDF
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Select any PDF from your device (Downloads, WhatsApp, Bluetooth, Xender, Files)
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-500" /> Max 100 MB
                </span>
                <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> 100% Offline & Private
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <button
                  type="button"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all pointer-events-none"
                >
                  Choose PDF File
                </button>
              </div>
            </div>

            {/* 3. RECENT PDF FILES SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Recent PDF Files
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                    {recentPdfs.length}
                  </span>
                </div>

                {recentPdfs.length > 0 && (
                  <button
                    onClick={refreshRecentPdfs}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Refresh List"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search in Recents */}
              {recentPdfs.length > 3 && (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search recent files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Recents list */}
              {isLoadingRecents ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                  Loading your documents...
                </div>
              ) : filteredRecents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredRecents.map((pdf) => (
                    <div
                      key={pdf.id}
                      onClick={() => loadDocumentFromRecord(pdf)}
                      className="group cursor-pointer bg-white dark:bg-[#1E293B] hover:bg-blue-50/50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl p-3.5 transition-all shadow-2xs hover:shadow-sm flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {pdf.fileName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-medium">
                            {pdf.pageCount && <span>{pdf.pageCount} pgs •</span>}
                            <span>{formatFileSize(pdf.sizeBytes)}</span>
                            <span>• {pdf.date || "Recent"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleDeleteRecent(e, pdf.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Remove from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1E293B] border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    No recent PDF files found
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Use the buttons above to open, merge, or modify documents.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: LOADING SCREEN WITH TIMEOUT & CANCEL RECOVERY
      ========================================================================== */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{loadingMsg}</h3>
            <p className="text-xs text-slate-400 mt-1">Preparing viewer for your device...</p>
          </div>
          <button
            onClick={() => {
              setIsLoading(false);
              setErrorMsg(null);
            }}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 cursor-pointer shadow-xs"
          >
            Cancel
          </button>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: PDF OPEN - FULL FEATURED RESPONSIVE VIEWER WITH IN-VIEWER ACTIONS
      ========================================================================== */}
      {pdfDoc && !isLoading && (
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Main Top Header Toolbar */}
          <div className="bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-800 px-2 sm:px-4 py-2 sticky top-0 z-30 shadow-xs">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
              {/* Left: Back / Close & Title */}
              <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                <button
                  onClick={handleCloseDocument}
                  className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close & Return to Tools"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="min-w-0">
                  <h1
                    className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[120px] sm:max-w-xs md:max-w-sm"
                    title={currentFileTitle}
                  >
                    {currentFileTitle}
                  </h1>
                  <span className="text-[10px] text-slate-400">
                    Page {pageNumber} of {numPages}
                  </span>
                </div>
              </div>

              {/* Middle: Scale & Rotation */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => {
                    setFitToWidth(!fitToWidth);
                    if (!fitToWidth) {
                      setScale(1.0);
                    }
                  }}
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    fitToWidth
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                  }`}
                  title="Fit to screen width"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Fit Width</span>
                </button>

                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => {
                      setFitToWidth(false);
                      setScale((s) => Math.max(0.4, Number((s - 0.15).toFixed(2))));
                    }}
                    className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-bold px-1.5 min-w-[36px] text-center text-slate-600 dark:text-slate-300">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={() => {
                      setFitToWidth(false);
                      setScale((s) => Math.min(3.0, Number((s + 0.15).toFixed(2))));
                    }}
                    className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  title="Rotate page 90 degrees"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Right: Quick Action Buttons (Print & Save) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="p-1.5 sm:px-3 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                  title="Print Document"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>

                <button
                  onClick={handleDownloadCopy}
                  className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                  title="Save / Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* SECONDARY QUICK ACTIONS BAR - ALWAYS VISIBLE ABOVE CANVAS WHEN FILE OPEN */}
          <div className="bg-slate-50 dark:bg-[#1E293B]/80 border-b border-slate-200/80 dark:border-slate-800 px-3 py-1.5 text-xs z-20 overflow-x-auto scrollbar-none">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 min-w-max">
              <div className="flex items-center gap-1.5">
                {/* 1. Remove Page Button */}
                <button
                  onClick={handleRemoveCurrentPage}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-300 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title={`Remove current page (${pageNumber})`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Remove Page {pageNumber}</span>
                </button>

                {/* 2. Rearrange Pages Button */}
                <button
                  onClick={() => {
                    setRearrangeMode("rearrange");
                    setShowRearrangeModal(true);
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-slate-200 dark:border-slate-700 hover:border-purple-300 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title="Reorder or delete pages in this document"
                >
                  <Move className="w-3.5 h-3.5" />
                  <span>Rearrange Pages</span>
                </button>

                {/* 3. Merge More PDFs Button */}
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title="Merge another document into this PDF"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Merge with Another PDF</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
                {/* 4. Switch / Open New PDF */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <FileUp className="w-3.5 h-3.5 text-blue-500" />
                  <span>Open Another File</span>
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Scrollable Content Viewport */}
          <div
            className="flex-1 overflow-auto p-2 sm:p-6 flex items-start justify-center bg-slate-200/70 dark:bg-[#0B1120]"
            ref={containerRef}
          >
            <div className="my-auto py-4 flex flex-col items-center">
              <canvas
                ref={canvasRef}
                className="shadow-xl rounded-md bg-white transition-transform duration-100 select-none max-w-full"
              />
            </div>
          </div>

          {/* Bottom Floating Navigation Dock (Mobile-First) */}
          <div className="bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-2.5 px-4 sticky bottom-0 z-20 shadow-lg">
            <div className="max-w-md mx-auto flex items-center justify-between gap-3">
              <button
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  max={numPages || 1}
                  value={pageNumber}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (val >= 1 && val <= numPages) {
                      setPageNumber(val);
                    }
                  }}
                  className="w-12 text-center py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 font-bold focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                <span>of {numPages}</span>
              </div>

              <button
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINT & SAVE AS SETTINGS MODAL
      ========================================================================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Print & Output Options
                </h3>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 text-blue-800 dark:text-blue-300">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 shrink-0 text-blue-500" />
                  Printer Settings & Quality
                </p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Tapping <strong>Print Now</strong> will invoke your device&apos;s native print preview. You can choose any connected printer, paper size (A4, Letter), page range, orientation, and color options.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Save Copy / File Name:
                </label>
                <input
                  type="text"
                  value={customSaveName}
                  onChange={(e) => setCustomSaveName(e.target.value)}
                  placeholder="document_name.pdf"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleTriggerPrint}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <Printer className="w-4 h-4" /> Print Document
              </button>

              <button
                onClick={handleDownloadCopy}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" /> Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MERGE PDFS MODAL
      ========================================================================== */}
      {showMergeModal && (
        <MergePdfModal
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          initialFile={
            pdfDoc && rawPdfBytes
              ? {
                  name: currentFileTitle,
                  bytes: rawPdfBytes,
                }
              : null
          }
          onMerged={(blob, name) => {
            handleFilePicked(new File([blob], name, { type: "application/pdf" }));
          }}
        />
      )}

      {/* =========================================================================
          REARRANGE / REMOVE PAGES MODAL
      ========================================================================== */}
      {showRearrangeModal && (
        <RearrangePagesModal
          isOpen={showRearrangeModal}
          onClose={() => setShowRearrangeModal(false)}
          pdfUrl={pdfUrl}
          pdfBytes={rawPdfBytes}
          fileName={currentFileTitle}
          initialMode={rearrangeMode}
          onSaved={(blob, name) => {
            handleFilePicked(new File([blob], name, { type: "application/pdf" }));
          }}
        />
      )}
    </div>
  );
};
