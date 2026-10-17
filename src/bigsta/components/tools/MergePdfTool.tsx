import React, { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { FileUp, FileText, X, ArrowDown, ArrowUp, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PdfFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

export const MergePdfTool: React.FC = () => {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: file.size,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const moveFile = (index: number, direction: "up" | "down") => {
    const newFiles = [...files];
    const target = index + (direction === "up" ? -1 : 1);
    if (target < 0 || target >= newFiles.length) return;
    [newFiles[index], newFiles[target]] = [newFiles[target], newFiles[index]];
    setFiles(newFiles);
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      toast.error("Please select at least two PDF files to merge.");
      return;
    }
    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const fileObj of files) {
        const arrayBuffer = await fileObj.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "merged.pdf";
      link.click();
      toast.success("PDFs merged successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to merge PDFs.");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-[#1E2328] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Merge PDF Files</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Combine multiple PDF files into one.</p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <FileUp className="w-4 h-4" />
          Select PDF Files
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" multiple className="hidden" />
      </div>

      <div className="space-y-2">
        {files.map((file, index) => (
          <div key={file.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#14171A] border border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => moveFile(index, "up")} disabled={index === 0} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => moveFile(index, "down")} disabled={index === files.length - 1} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><ArrowDown className="w-4 h-4" /></button>
              <button onClick={() => removeFile(file.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {files.length > 0 && (
        <button
          onClick={mergePdfs}
          disabled={isMerging}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isMerging ? "Merging..." : "Merge and Download PDF"}
        </button>
      )}
    </div>
  );
};
