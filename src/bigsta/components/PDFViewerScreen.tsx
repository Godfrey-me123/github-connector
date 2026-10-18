import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { 
  FileUp, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  RotateCw, Printer, Download, FileText, X, Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { useTemplateStore } from "../store/useTemplateStore";

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = "/node_modules/pdfjs-dist/build/pdf.worker.mjs";

export const PDFViewerScreen: React.FC = () => {
  const { setActiveScreen } = useTemplateStore();
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error("File is too large (max 100 MB).");
      return;
    }

    setIsLoading(true);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    setPdfDoc(pdf);
    setPdfUrl(URL.createObjectURL(file));
    setNumPages(pdf.numPages);
    setPageNumber(1);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!pdfDoc) return;

    const renderPage = async () => {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
    };

    renderPage();
  }, [pdfDoc, pageNumber, scale, rotation]);

  const handlePrint = () => {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl);
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    } else {
      toast.error("Popup blocked. Please allow popups to print.");
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "document.pdf";
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="bg-white p-4 flex items-center justify-between border-b sticky top-0 z-10">
        <button onClick={() => setActiveScreen("home")} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
        <div className="flex items-center gap-2">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))}><ZoomOut /></button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.1))}><ZoomIn /></button>
          <button onClick={() => setRotation(r => r + 90)}><RotateCw /></button>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" onChange={handleFileChange} accept="application/pdf" className="hidden" id="pdf-upload" />
          <label htmlFor="pdf-upload" className="cursor-pointer p-2 bg-blue-600 text-white rounded-full"><FileUp /></label>
          <button onClick={handleDownload} className="p-2 bg-slate-600 text-white rounded-full"><Download /></button>
          <button onClick={handlePrint} className="p-2 bg-slate-800 text-white rounded-full"><Printer /></button>
        </div>
      </div>
      
      <div className="flex-1 flex justify-center overflow-auto p-4" ref={containerRef}>
        {isLoading ? (
          <div className="flex items-center justify-center text-slate-500">
            <Loader2 className="w-12 h-12 animate-spin" />
            <p className="ml-4">Loading PDF...</p>
          </div>
        ) : pdfDoc ? (
          <canvas ref={canvasRef} className="shadow-lg bg-white" />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500">
            <FileText className="w-16 h-16 mb-4" />
            <p>Select a PDF to view</p>
          </div>
        )}
      </div>

      {pdfDoc && (
        <div className="bg-white p-4 flex justify-center items-center gap-4 border-t">
          <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber === 1}><ChevronLeft /></button>
          <span>Page {pageNumber} of {numPages}</span>
          <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber === numPages}><ChevronRight /></button>
        </div>
      )}
    </div>
  );
};
