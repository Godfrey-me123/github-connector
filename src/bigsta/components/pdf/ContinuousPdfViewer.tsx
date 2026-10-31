// @ts-nocheck -- PDF library typings are stricter than runtime; behaviour unchanged.
import React, { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  FileText,
  RotateCcw,
  Minimize2,
  PanelLeftClose,
  PanelLeft,
  Loader2,
  LayoutGrid,
} from "lucide-react";

export interface ContinuousPdfViewerProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  scale: number;
  rotation: number;
  onScaleChange: (newScale: number) => void;
  onRotationChange: (newRotation: number) => void;
  fitToWidth: boolean;
  onToggleFitWidth: () => void;
  activePageNumber: number;
  onActivePageChange: (page: number) => void;
  onToggleGridView?: () => void;
}

interface PageRenderItem {
  pageNumber: number;
  rendered: boolean;
  width: number;
  height: number;
}

export const ContinuousPdfViewer: React.FC<ContinuousPdfViewerProps> = ({
  pdfDoc,
  scale,
  rotation,
  onScaleChange,
  onRotationChange,
  fitToWidth,
  onToggleFitWidth,
  activePageNumber,
  onActivePageChange,
  onToggleGridView,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageItems, setPageItems] = useState<PageRenderItem[]>([]);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [jumpPageInput, setJumpPageInput] = useState<string>(String(activePageNumber));

  // Search state
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<{ pageNumber: number }[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Active rendering tasks map to cancel stale renders cleanly
  const renderTasksRef = useRef<Map<number, any>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  // Initialize page items with aspect ratios from first page
  useEffect(() => {
    let isCancelled = false;

    const initPages = async () => {
      try {
        const firstPage = await pdfDoc.getPage(1);
        const unscaledViewport = firstPage.getViewport({ scale: 1.0, rotation });
        const defaultWidth = unscaledViewport.width;
        const defaultHeight = unscaledViewport.height;

        const items: PageRenderItem[] = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          items.push({
            pageNumber: i,
            rendered: false,
            width: defaultWidth,
            height: defaultHeight,
          });
        }
        if (!isCancelled) {
          setPageItems(items);
        }
      } catch (e) {
        console.warn("Init pages error:", e);
      }
    };

    initPages();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, rotation]);

  // Compute effective scale (e.g. Fit to Width)
  const getEffectiveScale = useCallback(() => {
    if (fitToWidth && containerRef.current && pageItems.length > 0) {
      const containerW = containerRef.current.clientWidth - 48;
      const baseW = pageItems[0]?.width || 600;
      if (containerW > 0 && baseW > 0) {
        return Math.min(Math.max(containerW / baseW, 0.4), 3.0);
      }
    }
    return scale;
  }, [fitToWidth, scale, pageItems]);

  const effectiveScale = getEffectiveScale();

  const handleFitPage = () => {
    if (fitToWidth) onToggleFitWidth();
    if (containerRef.current && pageItems.length > 0) {
      const containerW = containerRef.current.clientWidth - 48;
      const containerH = containerRef.current.clientHeight - 64;
      const baseW = pageItems[0]?.width || 600;
      const baseH = pageItems[0]?.height || 842;
      if (containerW > 0 && containerH > 0) {
        const scaleW = containerW / baseW;
        const scaleH = containerH / baseH;
        const bestScale = Math.min(scaleW, scaleH);
        onScaleChange(Math.min(Math.max(Number(bestScale.toFixed(2)), 0.4), 2.5));
      }
    }
  };

  // Render individual page onto its canvas
  const renderPageCanvas = useCallback(
    async (pageNumber: number) => {
      const canvas = canvasRefs.current.get(pageNumber);
      if (!canvas || !pdfDoc) return;

      // Cancel existing render task for this page
      const currentTask = renderTasksRef.current.get(pageNumber);
      if (currentTask) {
        try {
          currentTask.cancel();
        } catch (e) {}
        renderTasksRef.current.delete(pageNumber);
      }

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: effectiveScale, rotation });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTasksRef.current.set(pageNumber, renderTask);

        await renderTask.promise;
        renderTasksRef.current.delete(pageNumber);

        setPageItems((prev) =>
          prev.map((item) =>
            item.pageNumber === pageNumber ? { ...item, rendered: true } : item
          )
        );
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.warn(`Page ${pageNumber} render issue:`, err);
        }
      }
    },
    [pdfDoc, effectiveScale, rotation]
  );

  // Lazy render visible pages with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = parseInt(entry.target.getAttribute("data-page-num") || "0", 10);
          if (entry.isIntersecting && pageNum > 0) {
            renderPageCanvas(pageNum);
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: "250px 0px", // Preload slightly before visible
        threshold: 0.05,
      }
    );

    const elements = document.querySelectorAll(".pdf-continuous-page-item");
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [pageItems, renderPageCanvas]);

  // Track active visible page while scrolling
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.getBoundingClientRect().top;
    const elements = document.querySelectorAll(".pdf-continuous-page-item");

    let closestPage = activePageNumber;
    let minDistance = Infinity;

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const distance = Math.abs(rect.top - containerTop - 60);
      if (distance < minDistance) {
        minDistance = distance;
        const pageNum = parseInt(el.getAttribute("data-page-num") || "1", 10);
        closestPage = pageNum;
      }
    });

    if (closestPage !== activePageNumber && closestPage > 0) {
      onActivePageChange(closestPage);
      setJumpPageInput(String(closestPage));
    }
  }, [activePageNumber, onActivePageChange]);

  // Jump to specific page
  const scrollToPage = (pageNum: number) => {
    const targetEl = document.getElementById(`pdf-page-container-${pageNum}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      onActivePageChange(pageNum);
      setJumpPageInput(String(pageNum));
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput.trim(), 10);
    if (!isNaN(p) && p >= 1 && p <= pdfDoc.numPages) {
      scrollToPage(p);
    } else {
      setJumpPageInput(String(activePageNumber));
    }
  };

  // Keyboard zoom shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !["input", "textarea"].includes((e.target as HTMLElement)?.tagName.toLowerCase())) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          onScaleChange(Math.min(3.0, Number((scale + 0.15).toFixed(2))));
        } else if (e.key === "-") {
          e.preventDefault();
          onScaleChange(Math.max(0.5, Number((scale - 0.15).toFixed(2))));
        } else if (e.key === "0") {
          e.preventDefault();
          onScaleChange(1.0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scale, onScaleChange]);

  // Generate lightweight thumbnails for sidebar
  useEffect(() => {
    if (!showThumbnails || Object.keys(thumbnails).length > 0) return;

    let isCancelled = false;
    const generateThumbs = async () => {
      const thumbs: Record<number, string> = {};
      const limit = Math.min(pdfDoc.numPages, 50);

      for (let i = 1; i <= limit; i++) {
        if (isCancelled) break;
        try {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbs[i] = canvas.toDataURL("image/jpeg", 0.7);
          }
        } catch (e) {}
      }
      if (!isCancelled) {
        setThumbnails(thumbs);
      }
    };

    generateThumbs();

    return () => {
      isCancelled = true;
    };
  }, [showThumbnails, pdfDoc, thumbnails]);

  // Search text in document
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const results: { pageNumber: number }[] = [];

    try {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageString = textContent.items
          .map((item: any) => item.str || "")
          .join(" ")
          .toLowerCase();

        if (pageString.includes(searchQuery.toLowerCase().trim())) {
          results.push({ pageNumber: i });
        }
      }

      setSearchResults(results);
      if (results.length > 0) {
        setCurrentResultIndex(0);
        scrollToPage(results[0].pageNumber);
      }
    } catch (e) {
      console.warn("Search error:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const nextSearchResult = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIdx);
    scrollToPage(searchResults[nextIdx].pageNumber);
  };

  const prevSearchResult = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentResultIndex(prevIdx);
    scrollToPage(searchResults[prevIdx].pageNumber);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-200/80 dark:bg-[#0B1120] relative">
      {/* Top Floating Sticky Reading Controls Bar */}
      <div className="bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 z-20 flex flex-wrap items-center justify-between gap-2 shadow-xs text-xs">
        {/* Left: Thumbnails Toggle & Page Indicator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 font-bold ${
              showThumbnails
                ? "bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-600 dark:text-blue-400"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
            title="Toggle Page Thumbnails Sidebar"
          >
            {showThumbnails ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            <span className="hidden sm:inline">Thumbnails</span>
          </button>

          {/* Jump to Page input */}
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1 font-bold">
            <span className="text-slate-500 text-[11px]">Page</span>
            <input
              type="number"
              min={1}
              max={pdfDoc.numPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              className="w-12 text-center py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            />
            <span className="text-slate-500 text-[11px]">of {pdfDoc.numPages}</span>
          </form>
        </div>

        {/* Middle: Genuine Scaling Controls & Presets */}
        <div className="flex items-center gap-1.5">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => onScaleChange(Math.max(0.5, Number((scale - 0.15).toFixed(2))))}
            className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Zoom Out (Ctrl -)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Presets Dropdown */}
          <select
            value={Math.round(scale * 100)}
            onChange={(e) => onScaleChange(Number(e.target.value) / 100)}
            className="py-1 px-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden"
          >
            <option value="50">50%</option>
            <option value="75">75%</option>
            <option value="100">100%</option>
            <option value="125">125%</option>
            <option value="150">150%</option>
            <option value="200">200%</option>
            <option value="300">300%</option>
          </select>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => onScaleChange(Math.min(3.0, Number((scale + 0.15).toFixed(2))))}
            className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Zoom In (Ctrl +)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Fit Width */}
          <button
            type="button"
            onClick={onToggleFitWidth}
            className={`p-1.5 px-2 rounded-lg text-xs font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
              fitToWidth
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
            }`}
            title="Fit Page to Width"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Fit Width</span>
          </button>

          {/* Fit Page */}
          <button
            type="button"
            onClick={handleFitPage}
            className="p-1.5 px-2 rounded-lg text-xs font-bold flex items-center gap-1 border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Fit Entire Page in Viewport"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Fit Page</span>
          </button>

          {/* Reset 100% */}
          <button
            type="button"
            onClick={() => onScaleChange(1.0)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
            title="Reset to 100% (Ctrl 0)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Rotate View */}
          <button
            type="button"
            onClick={() => onRotationChange((rotation + 90) % 360)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
            title="Rotate 90 Degrees"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Grid View Toggle & Text Search */}
        <div className="flex items-center gap-1.5">
          {onToggleGridView && (
            <button
              type="button"
              onClick={onToggleGridView}
              className="p-1.5 px-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              title="Switch to Grid View (Page Reordering & Multi-Select)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid View</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-lg border font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              showSearch
                ? "bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-600"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
            title="Search text in document"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </div>

      {/* In-Viewer Search Bar */}
      {showSearch && (
        <div className="bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-800 px-4 py-2 z-20 flex items-center justify-between gap-3 shadow-md animate-in slide-in-from-top duration-150">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Find text in document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Find"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>
                {currentResultIndex + 1} of {searchResults.length} match{searchResults.length !== 1 ? "es" : ""}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevSearchResult}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                  title="Previous match"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextSearchResult}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                  title="Next match"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
              setSearchResults([]);
            }}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Body: Sidebar + Continuous Vertical Scroll Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Thumbnails Sidebar */}
        {showThumbnails && (
          <div className="w-44 sm:w-52 bg-white dark:bg-[#1E293B] border-r border-slate-200 dark:border-slate-800 flex flex-col h-full z-10 shrink-0 shadow-sm animate-in slide-in-from-left duration-200">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Pages ({pdfDoc.numPages})</span>
              <button
                type="button"
                onClick={() => setShowThumbnails(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {pageItems.map((item) => {
                const isActive = item.pageNumber === activePageNumber;
                const thumb = thumbnails[item.pageNumber];

                return (
                  <button
                    key={`thumb_${item.pageNumber}`}
                    type="button"
                    onClick={() => scrollToPage(item.pageNumber)}
                    className={`w-full p-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      isActive
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-300 dark:ring-blue-800"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 hover:border-slate-400"
                    }`}
                  >
                    <div className="w-full aspect-[1/1.3] bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                      {thumb ? (
                        <img src={thumb} alt={`P.${item.pageNumber}`} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">P.{item.pageNumber}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      Page {item.pageNumber}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* WPS-LIKE CONTINUOUS VERTICAL READING CONTAINER */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-auto p-3 sm:p-6 flex flex-col items-center gap-4 sm:gap-6 scroll-smooth select-text"
        >
          {pageItems.map((item) => (
            <div
              key={`page_container_${item.pageNumber}`}
              id={`pdf-page-container-${item.pageNumber}`}
              data-page-num={item.pageNumber}
              className="pdf-continuous-page-item relative shadow-2xl rounded-sm bg-white border border-slate-200/90 transition-all flex flex-col items-center justify-center my-1"
              style={{
                width: `${Math.floor(item.width * effectiveScale)}px`,
                minHeight: `${Math.floor(item.height * effectiveScale)}px`,
              }}
            >
              {/* Canvas where PDF.js renders */}
              <canvas
                ref={(el) => {
                  if (el) canvasRefs.current.set(item.pageNumber, el);
                  else canvasRefs.current.delete(item.pageNumber);
                }}
                className="max-w-none block"
              />

              {/* Loading placeholder when not yet rendered */}
              {!item.rendered && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-[11px] font-bold">Page {item.pageNumber}</span>
                </div>
              )}

              {/* Floating page number watermark at bottom corner */}
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/40 text-white rounded text-[9px] font-bold pointer-events-none backdrop-blur-xs opacity-75">
                {item.pageNumber}
              </div>
            </div>
          ))}

          {/* End of Document notification */}
          <div className="py-6 text-center text-xs font-bold text-slate-400 flex items-center gap-2">
            <span className="h-px bg-slate-300 dark:bg-slate-700 w-12" />
            <span>End of Document ({pdfDoc.numPages} Pages)</span>
            <span className="h-px bg-slate-300 dark:bg-slate-700 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
};
