// @ts-nocheck -- PDF library typings are stricter than runtime; behaviour unchanged.
import React, { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument } from "pdf-lib";
import {
  FileUp,
  RotateCw,
  Printer,
  Download,
  FileText,
  ArrowLeft,
  Loader2,
  Search,
  Trash2,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  FolderOpen,
  Info,
  Layers,
  Move,
  Scissors,
  CheckCircle2,
  X,
  FileCheck,
  ArrowRightLeft,
  LayoutGrid,
  ScrollText,
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
import { DocxToPdfModal } from "./pdf/DocxToPdfModal";
import { PdfPageManager } from "./pdf/PdfPageManager";
import { ContinuousPdfViewer } from "./pdf/ContinuousPdfViewer";
import { PdfGridView } from "./pdf/PdfGridView";

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
  const [viewMode, setViewMode] = useState<"continuous" | "grid">("continuous");

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

  // Modals & Panels state
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showMergeModal, setShowMergeModal] = useState<boolean>(false);
  const [showRearrangeModal, setShowRearrangeModal] = useState<boolean>(false);
  const [showPageManager, setShowPageManager] = useState<boolean>(false);
  const [showDocxModal, setShowDocxModal] = useState<boolean>(false);
  const [showSavedDrawer, setShowSavedDrawer] = useState<boolean>(false);
  const [rearrangeMode, setRearrangeMode] = useState<"rearrange" | "remove">("rearrange");
  const [customSaveName, setCustomSaveName] = useState<string>("");

  // Inline quick actions in toolstrip
  const [inlineRemovePage, setInlineRemovePage] = useState<string>("");
  const [inlineMoveFrom, setInlineMoveFrom] = useState<string>("");
  const [inlineMoveTo, setInlineMoveTo] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

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
          r.service === "Modified PDF" ||
          r.service === "DOCX to PDF"
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

      // Preserve pristine clone so PDF.js worker transfer does NOT detach rawPdfBytes!
      const pristineBytes = arrayBuffer.slice(0);
      setRawPdfBytes(pristineBytes);

      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer.slice(0),
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

      // Clone buffer so rawPdfBytes is never detached
      const pristineBytes = arrayBuffer.slice(0);
      setRawPdfBytes(pristineBytes);

      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer.slice(0),
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
      await refreshRecentPdfs();
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
      toast.success("Removed from history.");
    } catch (err) {
      toast.error("Could not remove item.");
    }
  };

  // Handle file download directly to device with complete safety
  const handleDownloadCopy = (name?: string) => {
    const finalName = (name || customSaveName || currentFileTitle || "document.pdf").trim();
    const downloadName = finalName.toLowerCase().endsWith(".pdf") ? finalName : `${finalName}.pdf`;

    let downloadUrl = pdfUrl;
    let tempUrl: string | null = null;

    if (rawPdfBytes) {
      const blob = new Blob([rawPdfBytes.slice(0)], { type: "application/pdf" });
      tempUrl = URL.createObjectURL(blob);
      downloadUrl = tempUrl;
    }

    if (!downloadUrl) {
      toast.error("No document available to download.");
      return;
    }

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (tempUrl) {
      setTimeout(() => URL.revokeObjectURL(tempUrl!), 1000);
    }
    toast.success(`Downloaded: ${downloadName}`);
    setShowPrintModal(false);
  };

  // Remove a specific page by number or current page with pristine buffer safety
  const handleRemovePage = async (pageToRemove?: number) => {
    if (!rawPdfBytes) {
      toast.error("No document loaded.");
      return;
    }

    const target =
      pageToRemove ||
      (inlineRemovePage.trim() ? parseInt(inlineRemovePage.trim(), 10) : pageNumber);

    if (isNaN(target) || target < 1 || target > numPages) {
      toast.error(`Invalid page number: enter a number between 1 and ${numPages}.`);
      return;
    }

    if (numPages <= 1) {
      toast.error("Cannot remove page: document must contain at least one page.");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete Page ${target} of ${numPages} from this document?`
    );
    if (!confirmDelete) return;

    setIsLoading(true);
    setLoadingMsg(`Removing Page ${target}...`);

    try {
      const sourceDoc = await PDFDocument.load(rawPdfBytes.slice(0), { ignoreEncryption: true });
      sourceDoc.removePage(target - 1);

      const newUint8 = await sourceDoc.save();
      const newBuffer = newUint8.buffer.slice(
        newUint8.byteOffset,
        newUint8.byteOffset + newUint8.byteLength
      );
      const newBlob = new Blob([newBuffer], { type: "application/pdf" });
      const newObjUrl = URL.createObjectURL(newBlob);

      const newDoc = await pdfjsLib.getDocument({
        data: newBuffer.slice(0),
        cMapUrl: "https://unpkg.com/pdfjs-dist@6.4.299/cmaps/",
        cMapPacked: true,
      }).promise;

      setRawPdfBytes(newBuffer);
      setPdfDoc(newDoc);
      setPdfUrl(newObjUrl);
      setNumPages(newDoc.numPages);
      setPageNumber((p) => Math.min(p, newDoc.numPages));
      setInlineRemovePage("");

      const baseName = currentFileTitle.replace(/(_p\d+_removed|_mod\d*)*\.pdf$/i, "");
      const updatedFileName = `${baseName}_p${target}_removed.pdf`;
      setCurrentFileTitle(updatedFileName);
      setCustomSaveName(updatedFileName);

      const updatedRecord: DownloadRecord = {
        id: `pdf_mod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fileName: updatedFileName,
        service: "Modified PDF",
        format: "PDF",
        date: new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: Date.now(),
        dataUrl: newObjUrl,
        blobData: newBlob,
        status: "COMPLETED",
        sizeBytes: newBlob.size,
        pageCount: newDoc.numPages,
        lastModified: Date.now(),
      };

      await saveDownloadRecordDB(updatedRecord);
      await refreshRecentPdfs();

      toast.success(`Page ${target} removed and saved!`, {
        action: {
          label: "Download",
          onClick: () => handleDownloadCopy(updatedFileName),
        },
      });
    } catch (err: any) {
      console.error("Remove page error:", err);
      toast.error("Failed to remove page from document.");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick move page from one index to another position
  const handleQuickMovePage = async (fromPageNum?: number, toPositionNum?: number) => {
    if (!rawPdfBytes) {
      toast.error("No document loaded.");
      return;
    }

    const fromNum =
      fromPageNum ||
      (inlineMoveFrom.trim() ? parseInt(inlineMoveFrom.trim(), 10) : pageNumber);
    const toNum =
      toPositionNum ||
      (inlineMoveTo.trim() ? parseInt(inlineMoveTo.trim(), 10) : 1);

    if (isNaN(fromNum) || fromNum < 1 || fromNum > numPages) {
      toast.error(`Invalid "From" page: enter a number between 1 and ${numPages}.`);
      return;
    }

    if (isNaN(toNum) || toNum < 1 || toNum > numPages) {
      toast.error(`Invalid "To" position: enter a number between 1 and ${numPages}.`);
      return;
    }

    if (fromNum === toNum) {
      toast.info("Page is already at that position.");
      return;
    }

    setIsLoading(true);
    setLoadingMsg(`Moving Page ${fromNum} to position ${toNum}...`);

    try {
      const sourceDoc = await PDFDocument.load(rawPdfBytes.slice(0), { ignoreEncryption: true });
      const newDocPdf = await PDFDocument.create();

      const pageIndices = Array.from({ length: numPages }, (_, i) => i);
      const [moved] = pageIndices.splice(fromNum - 1, 1);
      pageIndices.splice(toNum - 1, 0, moved);

      const copiedPages = await newDocPdf.copyPages(sourceDoc, pageIndices);
      copiedPages.forEach((p) => newDocPdf.addPage(p));

      const newUint8 = await newDocPdf.save();
      const newBuffer = newUint8.buffer.slice(
        newUint8.byteOffset,
        newUint8.byteOffset + newUint8.byteLength
      );
      const newBlob = new Blob([newBuffer], { type: "application/pdf" });
      const newObjUrl = URL.createObjectURL(newBlob);

      const newPdf = await pdfjsLib.getDocument({
        data: newBuffer.slice(0),
        cMapUrl: "https://unpkg.com/pdfjs-dist@6.4.299/cmaps/",
        cMapPacked: true,
      }).promise;

      setRawPdfBytes(newBuffer);
      setPdfDoc(newPdf);
      setPdfUrl(newObjUrl);
      setPageNumber(toNum);
      setInlineMoveFrom("");
      setInlineMoveTo("");

      const baseName = currentFileTitle.replace(/(_reordered\d*)*\.pdf$/i, "");
      const updatedFileName = `${baseName}_reordered.pdf`;
      setCurrentFileTitle(updatedFileName);
      setCustomSaveName(updatedFileName);

      const updatedRecord: DownloadRecord = {
        id: `pdf_mod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fileName: updatedFileName,
        service: "Modified PDF",
        format: "PDF",
        date: new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: Date.now(),
        dataUrl: newObjUrl,
        blobData: newBlob,
        status: "COMPLETED",
        sizeBytes: newBlob.size,
        pageCount: newPdf.numPages,
        lastModified: Date.now(),
      };

      await saveDownloadRecordDB(updatedRecord);
      await refreshRecentPdfs();

      toast.success(`Moved Page ${fromNum} to position ${toNum} and saved!`, {
        action: {
          label: "Download",
          onClick: () => handleDownloadCopy(updatedFileName),
        },
      });
    } catch (err: any) {
      console.error("Move page error:", err);
      toast.error("Failed to move page.");
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
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveScreen("home")}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
                  PDF &amp; Print Studio
                </span>
              </div>
            </div>
          </div>

          {/* Centered Main Area */}
          <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6">
            {/* Error Banner if any */}
            {errorMsg && (
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-2xl flex items-start gap-3 text-red-700 dark:text-red-300 animate-in fade-in">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <div className="flex-1 text-xs">
                  <p className="font-bold">Notice</p>
                  <p className="mt-0.5">{errorMsg}</p>
                </div>
                <button
                  type="button"
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

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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
                      Open PDF
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      WPS-like continuous reader
                    </p>
                  </div>
                </button>

                {/* Tool 2: Open Doc File */}
                <button
                  type="button"
                  onClick={() => setShowDocxModal(true)}
                  className="p-4 bg-white dark:bg-[#1E293B] hover:bg-blue-50/60 dark:hover:bg-blue-950/30 border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-2xl text-left transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between gap-3 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      Open Doc File
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      Fetch .doc, .docx, or text file
                    </p>
                  </div>
                </button>

                {/* Tool 3: Merge PDFs */}
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
                      + Add files &amp; combine
                    </p>
                  </div>
                </button>

                {/* Tool 4: Drag & Drop Page Manager */}
                <button
                  type="button"
                  onClick={() => setShowPageManager(true)}
                  className="p-4 bg-white dark:bg-[#1E293B] hover:bg-purple-50/60 dark:hover:bg-purple-950/30 border-2 border-slate-200 dark:border-slate-800 hover:border-purple-500 rounded-2xl text-left transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between gap-3 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Move className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                      Page Manager
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      Drag to move &amp; page # inputs
                    </p>
                  </div>
                </button>

                {/* Tool 5: Remove Page */}
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
                      Insert page # or tap to delete
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
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> 100% Offline &amp; Private
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

            {/* 3. RECENT & MODIFIED PDF FILES SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Recent &amp; Modified PDF Files
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                    {recentPdfs.length}
                  </span>
                </div>

                {recentPdfs.length > 0 && (
                  <button
                    type="button"
                    onClick={refreshRecentPdfs}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                    placeholder="Search recent & modified files..."
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
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {pdf.fileName}
                            </p>
                            {pdf.service === "Modified PDF" && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded shrink-0">
                                Modified
                              </span>
                            )}
                            {pdf.service === "DOCX to PDF" && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded shrink-0">
                                Word Converted
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-medium">
                            {pdf.pageCount && <span>{pdf.pageCount} pgs •</span>}
                            <span>{formatFileSize(pdf.sizeBytes)}</span>
                            <span>• {pdf.date || "Recent"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (pdf.blobData) {
                              const url = URL.createObjectURL(pdf.blobData);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = pdf.fileName;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              toast.success(`Downloaded: ${pdf.fileName}`);
                            } else if (pdf.dataUrl) {
                              const a = document.createElement("a");
                              a.href = pdf.dataUrl;
                              a.download = pdf.fileName;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              toast.success(`Downloaded: ${pdf.fileName}`);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                          title="Download this file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
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
                    Use the buttons above to open, convert Word documents, merge, or modify files.
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
            type="button"
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
          VIEW 3: PDF OPEN - FULL FEATURED CONTINUOUS VERTICAL READER (WPS-LIKE)
      ========================================================================== */}
      {pdfDoc && !isLoading && (
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Main Top Header Toolbar */}
          <div className="bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2 sticky top-0 z-30 shadow-xs">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
              {/* Left: Back / Close & Title */}
              <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleCloseDocument}
                  className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close & Return to Tools"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="min-w-0">
                  <h1
                    className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-xs md:max-w-sm"
                    title={currentFileTitle}
                  >
                    {currentFileTitle}
                  </h1>
                  <span className="text-[10px] text-slate-400">
                    {viewMode === "grid" ? "Grid View" : "Continuous Scroll"} • {numPages} Page{numPages !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* View Mode Segmented Control: Reader View vs Grid View */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 ml-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("continuous")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === "continuous"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                    title="Continuous Vertical Reader"
                  >
                    <ScrollText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reader</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                    title="Grid View (Sortable Thumbnails & Multi-Select)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Grid View</span>
                  </button>
                </div>
              </div>

              {/* Right: Quick Action Buttons (Saved Files, Print, Download) */}
              <div className="flex items-center gap-1.5">
                {/* Dedicated Drag-and-Drop Page Manager Button */}
                <button
                  type="button"
                  onClick={() => setShowPageManager(true)}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
                  title="Open Drag-and-Drop Page Manager with page number movement"
                >
                  <Move className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="hidden sm:inline">Page Manager</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSavedDrawer(true)}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="View Saved &amp; Modified Files"
                >
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  <span className="hidden lg:inline">Saved Files ({recentPdfs.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="p-1.5 sm:px-3 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                  title="Print Document"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadCopy()}
                  className="p-1.5 sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                  title="Direct Download PDF"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECONDARY QUICK ACTIONS BAR - ALWAYS VISIBLE ABOVE VIEWER */}
          <div className="bg-slate-50 dark:bg-[#1E293B]/80 border-b border-slate-200/80 dark:border-slate-800 px-3 py-1.5 text-xs z-20 overflow-x-auto scrollbar-none">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 min-w-max">
              <div className="flex items-center gap-2">
                {/* 1. Quick Remove Page with Page Number input */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <Scissors className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Remove Page:</span>
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={inlineRemovePage}
                    onChange={(e) => setInlineRemovePage(e.target.value)}
                    placeholder={String(pageNumber)}
                    className="w-12 text-center py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePage()}
                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold cursor-pointer transition-colors"
                    title="Remove specified page number"
                  >
                    Remove
                  </button>
                </div>

                {/* 2. Quick Move Page with From and To Page Number inputs */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <Move className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Move:</span>
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={inlineMoveFrom}
                    onChange={(e) => setInlineMoveFrom(e.target.value)}
                    placeholder={String(pageNumber)}
                    className="w-12 text-center py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold"
                  />
                  <span className="text-[10px] font-bold text-slate-400">to</span>
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={inlineMoveTo}
                    onChange={(e) => setInlineMoveTo(e.target.value)}
                    placeholder="Pos"
                    className="w-12 text-center py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickMovePage()}
                    className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold cursor-pointer transition-colors"
                    title="Move page to position"
                  >
                    Move
                  </button>
                </div>

                {/* 3. Grid View Toggle (Sortable Thumbnails & Multi-Select) */}
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === "grid" ? "continuous" : "grid")}
                  className={`px-2.5 py-1.5 rounded-lg font-black flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs border ${
                    viewMode === "grid"
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-slate-200 dark:border-slate-700 hover:border-purple-300"
                  }`}
                  title="Toggle Grid View for thumbnail reordering and multi-page selection"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{viewMode === "grid" ? "Exit Grid View" : "Grid View (Organizer)"}</span>
                </button>

                {/* 4. Page Manager Modal */}
                <button
                  type="button"
                  onClick={() => setShowPageManager(true)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title="Open drag-and-drop page manager dialog"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Page Manager</span>
                </button>

                {/* 5. Merge More PDFs Button */}
                <button
                  type="button"
                  onClick={() => setShowMergeModal(true)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title="Add files and merge into this PDF"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>+ Add &amp; Merge</span>
                </button>

                {/* 6. Open Doc File */}
                <button
                  type="button"
                  onClick={() => setShowDocxModal(true)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title="Open and convert any document (.doc, .docx, .txt, .rtf) to PDF"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span>Open Doc File</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
                {/* 7. Switch / Open New PDF */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <FileUp className="w-3.5 h-3.5 text-blue-500" />
                  <span>Open Another File</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEWER CONTENT: CONTINUOUS VERTICAL READER OR SORTABLE THUMBNAIL GRID VIEW */}
          {viewMode === "grid" ? (
            <PdfGridView
              pdfDoc={pdfDoc}
              rawPdfBytes={rawPdfBytes}
              fileName={currentFileTitle}
              activePageNumber={pageNumber}
              onJumpToPage={(p) => {
                setPageNumber(p);
                setViewMode("continuous");
              }}
              onSaveDocument={async (newBlob, updatedFileName, newBytes) => {
                await handleFilePicked(newBlob, updatedFileName);
              }}
              onCloseGrid={() => setViewMode("continuous")}
            />
          ) : (
            <ContinuousPdfViewer
              pdfDoc={pdfDoc}
              scale={scale}
              rotation={rotation}
              onScaleChange={setScale}
              onRotationChange={setRotation}
              fitToWidth={fitToWidth}
              onToggleFitWidth={() => {
                setFitToWidth(!fitToWidth);
                if (!fitToWidth) setScale(1.0);
              }}
              activePageNumber={pageNumber}
              onActivePageChange={setPageNumber}
              onToggleGridView={() => setViewMode("grid")}
            />
          )}
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
                  Print &amp; Output Options
                </h3>
              </div>
              <button
                type="button"
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
                  Printer Settings &amp; Quality
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
                type="button"
                onClick={handleTriggerPrint}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <Printer className="w-4 h-4" /> Print Current Document
              </button>

              <button
                type="button"
                onClick={() => handleDownloadCopy()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" /> Download PDF File
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowPrintModal(false);
                    setActiveScreen("pdf_library");
                  }}
                  className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span>Open PDF Library</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPrintModal(false);
                    setShowDocxModal(true);
                  }}
                  className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Word to PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SAVED & MODIFIED DOCUMENTS DRAWER / MODAL
      ========================================================================== */}
      {showSavedDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Saved &amp; Modified Documents
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    {recentPdfs.length} file{recentPdfs.length !== 1 ? "s" : ""} saved in your local storage
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {recentPdfs.length > 0 ? (
                recentPdfs.map((pdf) => {
                  const isCurrent = pdf.fileName === currentFileTitle;
                  return (
                    <div
                      key={pdf.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[180px] sm:max-w-xs">
                              {pdf.fileName}
                            </p>
                            {pdf.service === "Modified PDF" && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded shrink-0">
                                Modified
                              </span>
                            )}
                            {pdf.service === "DOCX to PDF" && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded shrink-0">
                                Word Converted
                              </span>
                            )}
                            {isCurrent && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded shrink-0">
                                Currently Viewing
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                            {pdf.pageCount && <span>{pdf.pageCount} pgs •</span>}
                            <span>{formatFileSize(pdf.sizeBytes)}</span>
                            <span>• {pdf.date || "Recent"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            loadDocumentFromRecord(pdf);
                            setShowSavedDrawer(false);
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (pdf.blobData) {
                              const url = URL.createObjectURL(pdf.blobData);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = pdf.fileName;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              toast.success(`Downloaded: ${pdf.fileName}`);
                            } else if (pdf.dataUrl) {
                              const a = document.createElement("a");
                              a.href = pdf.dataUrl;
                              a.download = pdf.fileName;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              toast.success(`Downloaded: ${pdf.fileName}`);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRecent(e, pdf.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Delete from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No saved or modified files yet.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-[11px] text-slate-500">
                100% Offline • Saved in Browser IndexedDB
              </span>
              <button
                type="button"
                onClick={() => setShowSavedDrawer(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DOCX TO PDF CONVERTER MODAL
      ========================================================================== */}
      {showDocxModal && (
        <DocxToPdfModal
          isOpen={showDocxModal}
          onClose={() => setShowDocxModal(false)}
          onOpenPdf={(blob, name) => {
            handleFilePicked(new File([blob], name, { type: "application/pdf" }), name);
          }}
        />
      )}

      {/* =========================================================================
          DRAG-AND-DROP PDF PAGE MANAGER COMPONENT (DIRECTLY ACCESSIBLE FROM VIEWER)
      ========================================================================== */}
      {showPageManager && (
        <PdfPageManager
          isOpen={showPageManager}
          onClose={() => setShowPageManager(false)}
          pdfBytes={rawPdfBytes ? rawPdfBytes.slice(0) : null}
          fileName={currentFileTitle}
          currentPage={pageNumber}
          onSave={async (newBlob, newFileName, newBytes) => {
            handleFilePicked(new File([newBlob], newFileName, { type: "application/pdf" }), newFileName);
          }}
        />
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
                  bytes: rawPdfBytes.slice(0),
                }
              : null
          }
          onMerged={(blob, name) => {
            handleFilePicked(new File([blob], name, { type: "application/pdf" }), name);
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
          pdfBytes={rawPdfBytes ? rawPdfBytes.slice(0) : null}
          fileName={currentFileTitle}
          initialMode={rearrangeMode}
          onSaved={(blob, name) => {
            handleFilePicked(new File([blob], name, { type: "application/pdf" }), name);
          }}
        />
      )}
    </div>
  );
};
