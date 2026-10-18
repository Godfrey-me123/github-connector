import React, { useState, useEffect } from "react";
import { Search, FileText, ArrowLeft } from "lucide-react";
import { useTemplateStore } from "../store/useTemplateStore";
import { DownloadRecord, getAllDownloadRecordsDB } from "../utils/idb";

export const PdfLibraryScreen: React.FC = () => {
  const { setActiveScreen } = useTemplateStore();
  const [pdfs, setPdfs] = useState<DownloadRecord[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadPdfs = async () => {
      const records = await getAllDownloadRecordsDB();
      setPdfs(records.filter((r) => r.format === "PDF"));
    };
    loadPdfs();
  }, []);

  const filteredPdfs = pdfs.filter((p) =>
    p.fileName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setActiveScreen("home")} className="p-2 hover:bg-slate-200 rounded-full"><ArrowLeft /></button>
        <h1 className="text-xl font-bold">PDF Library</h1>
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
              // Assuming PDFViewerScreen can take a URL or we need to pass the file content
              // For now, this is a placeholder for the navigation logic
              console.log("Opening PDF:", pdf.id);
              setActiveScreen("pdf_viewer");
            }}
            className="w-full p-4 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center gap-4"
          >
            <FileText className="text-blue-500" />
            <div className="text-left">
              <p className="font-bold text-sm truncate">{pdf.fileName}</p>
              <p className="text-xs text-slate-500">{pdf.date}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
