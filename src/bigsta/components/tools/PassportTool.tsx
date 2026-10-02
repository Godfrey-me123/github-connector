// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Check, Sparkles, Sliders, Download, Scissors } from 'lucide-react';
import { Canvas, Image as FabricImage } from 'fabric';
import { PassportDocumentSpec, PASSPORT_SPECS } from '../../types/passport';
import { UniversalBackButton } from '../common/UniversalBackButton';

interface PassportToolProps {
  initialFile?: File | null;
  onBack?: () => void;
}

export const PassportTool: React.FC<PassportToolProps> = ({ initialFile, onBack }) => {
  const [step, setStep] = useState<'country' | 'photo' | 'edit'>('country');
  const [selectedSpec, setSelectedSpec] = useState<PassportDocumentSpec | null>(PASSPORT_SPECS[0]);
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [bgRemoved, setBgRemoved] = useState<boolean>(false);
  const [bgColor, setBgColor] = useState<string>('#ffffff');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);

  useEffect(() => {
    if (step === 'edit' && canvasRef.current && !fabricCanvas.current) {
      fabricCanvas.current = new Canvas(canvasRef.current, {
        width: 350,
        height: 450,
        backgroundColor: bgColor
      });
      
      if (file) {
        const url = URL.createObjectURL(file);
        FabricImage.fromURL(url).then(img => {
          img.scaleToWidth(280);
          fabricCanvas.current?.add(img);
          fabricCanvas.current?.centerObject(img);
          fabricCanvas.current?.renderAll();
        });
      }
    }
  }, [step, file, bgColor]);

  const handleExport = () => {
    if (!fabricCanvas.current) return;
    const dataURL = fabricCanvas.current.toDataURL({
      format: 'jpeg',
      quality: 0.95,
      multiplier: 2
    });
    const link = document.createElement('a');
    link.download = `${selectedSpec?.country.toLowerCase() || 'passport'}_photo.jpg`;
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 text-slate-900 dark:text-white">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold">
              ← Back
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight">Passport & Visa Size Photo Studio</h1>
            <p className="text-xs text-slate-500">Official biometric passport & visa photo crop, background removal & sizing</p>
          </div>
        </div>
      </div>
      
      {step === 'country' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Select Document & Country Spec</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PASSPORT_SPECS.map((spec, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedSpec(spec); setStep('photo'); }}
                className="p-4 bg-white dark:bg-[#1E2328] rounded-2xl border border-slate-200 dark:border-white/10 hover:border-blue-500 text-left transition-all shadow-xs group cursor-pointer"
              >
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600">{spec.country}</div>
                <div className="text-xs text-slate-500 mt-0.5">{spec.document} ({spec.widthMm}mm × {spec.heightMm}mm @ {spec.dpi} DPI)</div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {step === 'photo' && (
        <div className="space-y-6 text-center bg-white dark:bg-[#1E2328] p-8 rounded-2xl border border-slate-200 dark:border-white/10">
            <div>
              <h2 className="text-base font-bold">Upload Portrait Photo for {selectedSpec?.country} {selectedSpec?.document}</h2>
              <p className="text-xs text-slate-500 mt-1">Make sure face is clearly visible with neutral expression and direct lighting.</p>
            </div>
            
            <label className="inline-block p-10 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-2xl cursor-pointer hover:border-blue-500 bg-slate-50 dark:bg-white/5 transition-colors">
                <Upload className="w-10 h-10 text-blue-600 mx-auto" />
                <span className="block mt-2 font-bold text-xs">Select Portrait Image</span>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
                    if (e.target.files?.[0]) {
                        setFile(e.target.files[0]);
                        setStep('edit');
                    }
                }} />
            </label>
            <div>
              <button onClick={() => setStep('country')} className="text-xs text-blue-600 font-bold hover:underline">
                Change Country / Spec
              </button>
            </div>
        </div>
      )}

      {step === 'edit' && (
          <div className="bg-white dark:bg-[#1E2328] p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold">Crop & Position Photo</h2>
                  <p className="text-xs text-slate-500">{selectedSpec?.country} — {selectedSpec?.widthMm}x{selectedSpec?.heightMm}mm</p>
                </div>
                <button onClick={() => setStep('photo')} className="text-xs font-bold text-blue-600">
                  Change Photo
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
                <div className="bg-slate-100 dark:bg-black/40 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                  <canvas ref={canvasRef} className="border border-slate-300 dark:border-white/20 rounded shadow-sm mx-auto" />
                </div>

                <div className="space-y-4 w-full max-w-xs">
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 space-y-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Background Color</span>
                    <div className="flex gap-2">
                      <button onClick={() => setBgColor('#ffffff')} className={`w-8 h-8 rounded-full border bg-white ${bgColor === '#ffffff' ? 'ring-2 ring-blue-600' : ''}`} title="White" />
                      <button onClick={() => setBgColor('#3b82f6')} className={`w-8 h-8 rounded-full border bg-blue-500 ${bgColor === '#3b82f6' ? 'ring-2 ring-blue-600' : ''}`} title="Blue" />
                      <button onClick={() => setBgColor('#ef4444')} className={`w-8 h-8 rounded-full border bg-red-500 ${bgColor === '#ef4444' ? 'ring-2 ring-blue-600' : ''}`} title="Red" />
                    </div>
                  </div>

                  <button
                    onClick={handleExport}
                    className="w-full py-3 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Download Passport Photo (HQ)
                  </button>
                </div>
              </div>
          </div>
      )}
    </div>
  );
};
