import React, { useEffect, useState } from "react";
import { subscribeDownloadProgress } from "../../utils/downloadHelper";
import { Download, CheckCircle2 } from "lucide-react";

export const DownloadProgressBar: React.FC = () => {
  const [activeDownload, setActiveDownload] = useState<{
    fileName: string;
    progressPercent: number;
    statusText: string;
    isDone: boolean;
  } | null>(null);

  useEffect(() => {
    return subscribeDownloadProgress((info) => {
      setActiveDownload(info);
      if (info.isDone) {
        setTimeout(() => {
          setActiveDownload((current) => (current?.fileName === info.fileName ? null : current));
        }, 2500);
      }
    });
  }, []);

  if (!activeDownload) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 overflow-hidden">
          {activeDownload.isDone ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <Download className="w-5 h-5 text-sky-400 shrink-0 animate-bounce" />
          )}
          <span className="text-xs font-bold truncate">{activeDownload.fileName}</span>
        </div>
        <span className="text-xs font-mono text-sky-300 font-bold shrink-0">
          {activeDownload.progressPercent}%
        </span>
      </div>

      <p className="text-[11px] text-slate-300 mb-2 truncate">{activeDownload.statusText}</p>

      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            activeDownload.isDone ? "bg-emerald-500" : "bg-gradient-to-r from-sky-500 to-indigo-500"
          }`}
          style={{ width: `${Math.max(5, activeDownload.progressPercent)}%` }}
        />
      </div>
    </div>
  );
};
