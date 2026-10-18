import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Search, FileText, ArrowLeft } from "lucide-react";
import { useTemplateStore } from "../store/useTemplateStore";
import { DownloadRecord, getAllDownloadRecordsDB, saveDownloadRecordDB } from "../utils/idb";

export const PdfLibraryScreen: React.FC = () => {
  const { setActiveScreen } = useTemplateStore();
  const [pdfs, setPdfs] = useState<DownloadRecord[]>([]);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadPdfs = async () => {
      const records = await getAllDownloadRecordsDB();
      setPdfs(records.filter((r) => r.format === "PDF"));
    };
    loadPdfs();
  }, []);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const record: DownloadRecord = {
      id: `dl_${Date.now()}`,
      fileName: file.name,
      service: "Imported PDF",
      format: "PDF",
      date: new Date().toLocaleString(),
      timestamp: Date.now(),
      dataUrl: URL.createObjectURL(file),
      status: "COMPLETED",
      sizeBytes: file.size,
      pageCount: pdf.numPages,
      lastModified: file.lastModified,
    };
    await saveDownloadRecordDB(record);
    setPdfs((prev) => [record, ...prev]);
  };

  const filteredPdfs = pdfs.filter((p) =>
    p.fileName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setActiveScreen("home")} className="p-2 hover:bg-slate-200 rounded-full"><ArrowLeft /></button>
        <h1 className="text-xl font-bold">PDF Library</h1>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
        >
          Import PDF
        </button>
        <input type="file" ref={fileInputRef} onChange={handleImport} accept="application/pdf" className="hidden" />
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search PDFs..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filteredPdfs.map((pdf) => (
          <button
            key={pdf.id}
            onClick={() => {
              useTemplateStore.setState({ activePdf: pdf });
              setActiveScreen("pdf_viewer");
            }}
            className="w-full p-4 bg-white rounded-xl shadow-sm border border-slate-200 text-left"
          >
            <div className="flex items-center gap-4">
              <FileText className="text-blue-500 w-8 h-8" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{pdf.fileName}</p>
                <p className="text-xs text-slate-500">
                  {pdf.pageCount} pages • {Math.round((pdf.sizeBytes || 0) / 1024)} KB
                </p>
                <p className="text-xs text-slate-400">
                  {pdf.lastModified ? new Date(pdf.lastModified).toLocaleDateString() : pdf.date}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
