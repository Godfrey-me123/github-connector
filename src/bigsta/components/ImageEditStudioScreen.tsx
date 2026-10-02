// @ts-nocheck
import React from 'react';
import ImageEditApp from '../image-edit-app/App';
import { useTemplateStore } from '../store/useTemplateStore';
import { ArrowLeft } from 'lucide-react';

export const ImageEditStudioScreen: React.FC = () => {
  const { setActiveScreen } = useTemplateStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative selection:bg-emerald-500 selection:text-slate-950">
      {/* Floating Back to Portal Button */}
      <div className="absolute top-3 left-4 z-50">
        <button
          onClick={() => setActiveScreen('home')}
          className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700/80 shadow-md flex items-center gap-1.5 backdrop-blur-md transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" /> Return to BIGsta Portal
        </button>
      </div>

      <ImageEditApp />
    </div>
  );
};
