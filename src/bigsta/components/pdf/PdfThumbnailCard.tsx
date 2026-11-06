import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FileText, Eye, Download, Trash2, Loader2, AlertCircle } from "lucide-react";
import { DownloadRecord } from "../../utils/idb";

// Cache rendered thumbnail dataURLs in memory to avoid redundant rendering
const thumbnailCache = new Map<string, string>();

interface PdfThumbnailCardProps {
  pdf: DownloadRecord;
  onOpen: (pdf: DownloadRecord) => void;
  onDownload: (pdf: DownloadRecord) => void;
  onDelete: (pdf: DownloadRecord) => void;
}

export const PdfThumbnailCard: React.FC<PdfThumbnailCardProps> = ({
  pdf,
  onOpen,
  onDownload,
  onDelete,
}) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(() => thumbnailCache.get(pdf.id) || null);
  const [loading, setLoading] = useState<boolean>(!thumbnailCache.has(pdf.id));
  const [renderError, setRenderError] = useState<boolean>(false);
  const isMounted = useRef<boolean>(true);

  useEffect(() => {
    isMounted.current = true;

    if (thumbnailCache.has(pdf.id)) {
      setThumbUrl(thumbnailCache.get(pdf.id)!);
      setLoading(false);
      return;
    }

    let isCancelled = false;

    async function generateThumbnail() {
      try {
        setLoading(true);
        setRenderError(false);

        let data: ArrayBuffer | null = null;
        if (pdf.blobData) {
          data = await pdf.blobData.arrayBuffer();
        } else if (pdf.dataUrl && !pdf.dataUrl.startsWith("#")) {
          const resp = await fetch(pdf.dataUrl);
          data = await resp.arrayBuffer();
        }

        if (!data || data.byteLength === 0) {
          throw new Error("No binary data available");
        }

        const loadingTask = pdfjsLib.getDocument({
          data: data.slice(0),
          cMapUrl: "https://unpkg.com/pdfjs-dist@6.4.299/cmaps/",
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        const page = await doc.getPage(1);
        if (isCancelled) return;

        // Render at reasonable resolution for crisp thumbnail
        const unscaledViewport = page.getViewport({ scale: 1 });
        const targetWidth = 240;
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create canvas 2d context");

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        // Fill background white
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render page
        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });
        await renderTask.promise;
        if (isCancelled) return;

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        thumbnailCache.set(pdf.id, dataUrl);

        if (isMounted.current) {
          setThumbUrl(dataUrl);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted.current && !isCancelled) {
          setRenderError(true);
          setLoading(false);
        }
      }
    }

    generateThumbnail();

    return () => {
      isCancelled = true;
      isMounted.current = false;
    };
  }, [pdf.id, pdf.blobData, pdf.dataUrl]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col overflow-hidden group">
      {/* Thumbnail Container */}
      <div
        onClick={() => onOpen(pdf)}
        className="relative w-full aspect-[4/3] bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden cursor-pointer border-b border-slate-100 dark:border-slate-800"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-[10px] font-medium">Generating preview...</span>
          </div>
        ) : thumbUrl && !renderError ? (
          <img
            src={thumbUrl}
            alt={pdf.fileName}
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-slate-400 p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-500 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-500">PDF Document</span>
          </div>
        )}

        {/* PDF Badge Indicator */}
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-md shadow-xs tracking-wider">
          PDF
        </div>

        {/* Page Count Badge */}
        {pdf.pageCount && pdf.pageCount > 0 && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold rounded-md shadow-xs">
            {pdf.pageCount} {pdf.pageCount === 1 ? "page" : "pages"}
          </div>
        )}

        {/* Hover Overlay Button */}
        <div className="absolute inset-0 bg-blue-900/20 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
          <span className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Read
          </span>
        </div>
      </div>

      {/* Document Info and Actions */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <h3
              onClick={() => onOpen(pdf)}
              className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
              title={pdf.fileName}
            >
              {pdf.fileName}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>{formatFileSize(pdf.sizeBytes)}</span>
            <span>•</span>
            <span>{pdf.lastModified ? new Date(pdf.lastModified).toLocaleDateString() : pdf.date}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onOpen(pdf)}
            className="flex-1 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open</span>
          </button>

          <button
            type="button"
            onClick={() => onDownload(pdf)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(pdf)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            title="Delete from library"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
