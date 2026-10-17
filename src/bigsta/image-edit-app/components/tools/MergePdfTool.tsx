import React, { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { FileUp, FileText, X, ArrowLeft, Download, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface PdfFile {
  id: string;
  file: File;
  name: string;
}

export const MergePdfTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [draggedFile, setDraggedFile] = useState<PdfFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragStart = (e: React.DragEvent, file: PdfFile) => {
    setDraggedFile(file);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetFile: PdfFile) => {
    e.preventDefault();
    if (!draggedFile || draggedFile.id === targetFile.id) return;
    
    const currentIndex = files.indexOf(draggedFile);
    const targetIndex = files.indexOf(targetFile);
    
    const newFiles = [...files];
    newFiles.splice(currentIndex, 1);
    newFiles.splice(targetIndex, 0, draggedFile);
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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft /></button>
        <h2 className="text-xl font-bold">Merge PDF Files</h2>
      </div>

      <div className="flex justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-slate-50 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <div className="text-center">
          <FileUp className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold">Click to select PDF files</p>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" multiple className="hidden" />
      </div>

      <div className="space-y-2">
        {files.map((file) => (
          <div 
            key={file.id} 
            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-move"
            draggable
            onDragStart={(e) => handleDragStart(e, file)}
            onDragOver={(e) => handleDragOver(e, file)}
          >
            <div className="flex items-center gap-3">
              <GripVertical className="w-4 h-4 text-slate-400" />
              <FileText className="w-5 h-5 text-slate-500" />
              <span className="text-sm text-slate-700">{file.name}</span>
            </div>
            <button onClick={() => removeFile(file.id)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      {files.length > 0 && (
        <button
          onClick={mergePdfs}
          disabled={isMerging}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
        >
          {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isMerging ? "Merging..." : "Merge and Download"}
        </button>
      )}
    </div>
  );
};
