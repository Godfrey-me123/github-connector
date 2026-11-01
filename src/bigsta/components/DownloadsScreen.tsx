import React, { useEffect, useState } from "react";
import { playNotificationSound } from "../utils/audioHandler";
import {
  DownloadCloud,
  Trash2,
  Search,
  CheckCircle2,
  Eye,
  RefreshCw,
  X,
  Share2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { useTemplateStore } from "../store/useTemplateStore";
import {
  DownloadRecord,
  getAllDownloadRecordsDB,
  deleteDownloadRecordDB,
  saveDownloadRecordDB,
  clearDownloadRecordsDB,
} from "../utils/idb";
import { UniversalBackButton } from "./common/UniversalBackButton";

export const DownloadsScreen: React.FC = () => {
  const { setActiveScreen, userPreferences } = useTemplateStore();

  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewRecord, setPreviewRecord] = useState<DownloadRecord | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string, ms = 3000) => {
    setToast(message);
    setTimeout(() => setToast(null), ms);
  };

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      const records = await getAllDownloadRecordsDB();
      // Remove any previously seeded fake samples from DB
      for (const r of records) {
        if (r.id.startsWith("dl_sample_")) {
          await deleteDownloadRecordDB(r.id);
        }
      }
      setDownloads(records.filter((r) => !r.id.startsWith("dl_sample_")));
    } catch (e) {
      console.error("Error loading downloads", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDownloadRecordDB(id);
      setDownloads(downloads.filter((d) => d.id !== id));
      showToast("File removed from Downloads");
    } catch (e) {
      console.error("Error deleting download", e);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearDownloadRecordsDB();
      setDownloads([]);
      setConfirmClearAll(false);
      showToast("All downloads cleared");
    } catch (e) {
      console.error("Error clearing downloads", e);
      showToast("Could not clear downloads. Please try again.");
    }
  };

  const handleDownload = async (record: DownloadRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      playNotificationSound();
      if (record.blobData) {
        const url = URL.createObjectURL(record.blobData);
        const link = document.createElement("a");
        link.download = record.fileName;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (record.dataUrl && !record.dataUrl.startsWith("#")) {
        const link = document.createElement("a");
        link.download = record.fileName;
        link.href = record.dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        showToast("File content is unavailable on this device.");
        return;
      }

      if (record.status === "READY") {
        record.status = "DOWNLOADED";
        await saveDownloadRecordDB(record);
        setDownloads([...downloads]);
      }

      const folderName = userPreferences.downloadFolder || "Downloads/BIGsta";
      showToast(`Saved to device: ${folderName}/${record.fileName}`, 3500);
    } catch (err) {
      console.error("Download delivery failed:", err);
    }
  };

  const handleShare = async (record: DownloadRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (
        record.blobData &&
        navigator.canShare &&
        navigator.canShare({
          files: [
            new File([record.blobData], record.fileName, {
              type: record.blobData.type || "application/octet-stream",
            }),
          ],
        })
      ) {
        const fileObj = new File([record.blobData], record.fileName, {
          type: record.blobData.type || "application/octet-stream",
        });
        await navigator.share({ files: [fileObj], title: record.fileName });
        return;
      } else if (navigator.share) {
        await navigator.share({
          title: record.fileName,
          text: `BIGsta Document: ${record.fileName}`,
        });
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }
    // Fallback: download directly
    handleDownload(record);
  };

  const handleOpen = (record: DownloadRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (record.format === "PDF" || record.fileName.toLowerCase().endsWith(".pdf")) {
      useTemplateStore.setState({ activePdf: record });
      setActiveScreen("pdf_viewer");
    } else {
      setPreviewRecord(record);
    }
  };

  const filteredDownloads = downloads.filter(
    (d) =>
      d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.service.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isImage = (record: DownloadRecord) =>
    record.format !== "PDF" && !record.fileName.toLowerCase().endsWith(".pdf");

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 text-[#111827]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UniversalBackButton />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <DownloadCloud className="w-5 h-5 text-[#2563EB] shrink-0" />
                Downloads
              </h1>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
              {downloads.length}
            </span>
          </div>

          {downloads.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 pt-4 space-y-4">
        {/* Toast */}
        {toast && (
          <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-medium animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by document name or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-600" />
            <p className="text-xs font-semibold">Loading your downloads...</p>
          </div>
        ) : filteredDownloads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
            <DownloadCloud className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No documents found</p>
            <p className="text-xs text-slate-400">
              Generate a document from NIDA, Driving License or other services to see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredDownloads.map((record) => (
              <div
                key={record.id}
                onClick={() => handleOpen(record)}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      record.format === "PDF"
                        ? "bg-red-50 text-red-600 border border-red-100"
                        : "bg-blue-50 text-blue-600 border border-blue-100"
                    }`}
                  >
                    {record.format === "PDF" ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {record.fileName}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                        {record.format === "PDF" ? "PDF" : "IMG"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {record.service} • {record.date} •{" "}
                      {((record.sizeBytes || 1200000) / 1000000).toFixed(2)} MB
                    </p>
                    {record.status === "FAILED" && (
                      <p className="text-xs font-semibold text-red-600 truncate">
                        Failed: {record.failureReason || "Generation timeout."}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {record.status !== "FAILED" && (
                    <>
                      <button
                        onClick={(e) => handleOpen(record, e)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all cursor-pointer"
                        title="Open"
                        aria-label="Open document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDownload(record, e)}
                        className="p-2 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-100 border border-slate-200 rounded-xl transition-all"
                        title="Download"
                        aria-label="Download file"
                      >
                        <DownloadCloud className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleShare(record, e)}
                        className="p-2 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-100 border border-slate-200 rounded-xl transition-all"
                        title="Share"
                        aria-label="Share document"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => handleDelete(record.id, e)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete"
                    aria-label="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear All Confirmation */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Clear all downloads?</h3>
            </div>
            <p className="text-xs text-slate-500">
              This permanently removes all {downloads.length} saved document
              {downloads.length === 1 ? "" : "s"} from this device. This cannot be undone.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setConfirmClearAll(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple Image Preview Modal */}
      {previewRecord && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewRecord(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">{previewRecord.fileName}</h3>
                  <p className="text-[11px] text-slate-400">
                    {previewRecord.service} • {previewRecord.format}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(previewRecord)}
                  className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <DownloadCloud className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  onClick={() => setPreviewRecord(null)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-900 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
              {previewRecord.dataUrl && isImage(previewRecord) ? (
                <img
                  src={previewRecord.dataUrl}
                  alt={previewRecord.fileName}
                  className="max-h-[70vh] object-contain rounded-xl"
                />
              ) : (
                <div className="text-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <FileText className="w-12 h-12 text-blue-400" />
                  <p className="text-sm font-bold">Preview unavailable</p>
                  <p className="text-xs text-slate-400">{previewRecord.fileName}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
