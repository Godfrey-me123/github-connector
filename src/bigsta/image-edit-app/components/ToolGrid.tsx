// @ts-nocheck -- imported legacy BIGsta code
import React from 'react';
import {
  Sparkles,
  Maximize2,
  FileArchive,
  Crop,
  RotateCw,
  FileType,
  Stamp,
  FileText,
  Zap,
  FileEdit,
  User,
  ArrowRight,
  Upload
} from 'lucide-react';
import { ToolId } from '../types/imageTools';

interface ToolGridProps {
  onSelectTool: (toolId: ToolId) => void;
  onQuickUpload: (files: FileList) => void;
}

interface ToolCard {
  id: ToolId;
  title: string;
  icon: React.ReactNode;
}

export const ToolGrid: React.FC<ToolGridProps> = ({ onSelectTool, onQuickUpload }) => {
  const tools: ToolCard[] = [
    { id: 'passport', title: 'Passport', icon: <User className="w-5 h-5 text-blue-600" /> },
    { id: 'remove-bg', title: 'Remove BG', icon: <Sparkles className="w-5 h-5 text-emerald-600" /> },
    { id: 'resize', title: 'Resize', icon: <Maximize2 className="w-5 h-5 text-blue-600" /> },
    { id: 'compress', title: 'Compress', icon: <FileArchive className="w-5 h-5 text-purple-600" /> },
    { id: 'crop', title: 'Crop', icon: <Crop className="w-5 h-5 text-amber-600" /> },
    { id: 'rotate', title: 'Rotate', icon: <RotateCw className="w-5 h-5 text-cyan-600" /> },
    { id: 'convert', title: 'Convert', icon: <FileType className="w-5 h-5 text-teal-600" /> },
    { id: 'watermark', title: 'Watermark', icon: <Stamp className="w-5 h-5 text-rose-600" /> },
    { id: 'ocr', title: 'OCR', icon: <FileText className="w-5 h-5 text-indigo-600" /> },
    { id: 'enhance', title: 'Enhance', icon: <Zap className="w-5 h-5 text-yellow-600" /> },
    { id: 'rename', title: 'Rename', icon: <FileEdit className="w-5 h-5 text-orange-600" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 bg-[#f8fafc] min-h-[calc(100vh-100px)]">
      {/* Upload Box */}
      <label className="relative group cursor-pointer block bg-white hover:bg-slate-50 border-2 border-dashed border-blue-400 rounded-2xl p-6 transition-all shadow-xs text-center">
        <input
          type="file"
          multiple
          accept="image/*, application/pdf, .pdf"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onQuickUpload(e.target.files);
            }
          }}
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">
            Upload Image
          </span>
        </div>
      </label>

      {/* Grid of Tools */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {tools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className="bg-white hover:bg-blue-50/50 border border-slate-200 rounded-2xl p-4 transition-all cursor-pointer flex flex-col items-center text-center shadow-2xs group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              {tool.icon}
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
              {tool.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
