// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Check, Sparkles, Sliders, Download, Printer, Scissors, ZoomIn, ZoomOut, RotateCw, RefreshCw, X, Home, MessageSquare, Share2, Edit3, Plus, Minus, ChevronRight } from 'lucide-react';
import { Canvas, Image as FabricImage } from 'fabric';
import { PassportDocumentSpec, PASSPORT_SPECS } from '../../types/passport';

interface PassportToolProps {
  initialFile?: File | null;
  onBack: () => void;
}

const PAPER_SIZES = [
  { name: '3R (3.5x5 inches)', widthMm: 89, heightMm: 127, defaultCols: 3, maxCopies: 12 },
  { name: '4R (4x6 inches)', widthMm: 102, heightMm: 152, defaultCols: 4, maxCopies: 16 },
  { name: '5R (5x7 inches)', widthMm: 127, heightMm: 178, defaultCols: 4, maxCopies: 20 },
  { name: '6R (6x8 inches)', widthMm: 152, heightMm: 203, defaultCols: 5, maxCopies: 30 },
  { name: '8R (8x10 inches)', widthMm: 203, heightMm: 254, defaultCols: 5, maxCopies: 35 },
  { name: 'A4 Paper (8.27x11.69 inches)', widthMm: 210, heightMm: 297, defaultCols: 6, maxCopies: 42 },
  { name: 'S8R (8x12 inches)', widthMm: 203, heightMm: 305, defaultCols: 6, maxCopies: 48 },
  { name: '10R (10x12 inches)', widthMm: 254, heightMm: 305, defaultCols: 6, maxCopies: 48 },
];

const EXTENDED_COLORS = [
  { name: 'Transparent', hex: 'transparent' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#000000' },
  { name: 'Light Grey', hex: '#f1f5f9' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Sky Blue', hex: '#38bdf8' },
  { name: 'Navy', hex: '#1e3a8a' },
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Pink', hex: '#db2777' },
];

export const PassportTool: React.FC<PassportToolProps> = ({ initialFile, onBack }) => {
  const [step, setStep] = useState<'upload' | 'edit' | 'summary' | 'paper_size' | 'print_grid'>('upload');
  const [selectedSpec, setSelectedSpec] = useState<PassportDocumentSpec>(PASSPORT_SPECS[0]);
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileSizeKb, setFileSizeKb] = useState<number>(63.92);

  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [colorTab, setColorTab] = useState<'basic' | 'premium' | 'custom'>('basic');
  const [activeBottomTool, setActiveBottomTool] = useState<'remove_bg' | 'adjust' | 'background' | 'beauty' | null>('background');
  
  const [selectedPaper, setSelectedPaper] = useState(PAPER_SIZES[7]); // Default 10R
  const [copies, setCopies] = useState<number>(48); // Default 48 copies matching screenshot
  const [spacing, setSpacing] = useState<number>(0);
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);

  useEffect(() => {
    if (initialFile) {
      setFile(initialFile);
      setFileSizeKb(Math.round((initialFile.size / 1024) * 100) / 100);
      const url = URL.createObjectURL(initialFile);
      setPreviewUrl(url);
      setStep('edit');
    }
  }, [initialFile]);

  useEffect(() => {
    if (step === 'edit' && canvasRef.current && !fabricCanvas.current) {
      const cWidth = 260;
      const cHeight = Math.round(cWidth * (selectedSpec.heightMm / selectedSpec.widthMm));

      fabricCanvas.current = new Canvas(canvasRef.current, {
        width: cWidth,
        height: cHeight,
        backgroundColor: bgColor === 'transparent' ? undefined : bgColor
      });

      if (file || previewUrl) {
        const url = previewUrl || (file ? URL.createObjectURL(file) : '');
        if (url) {
          FabricImage.fromURL(url).then(img => {
            img.scaleToWidth(cWidth * 0.85);
            fabricCanvas.current?.add(img);
            fabricCanvas.current?.centerObject(img);
            fabricCanvas.current?.renderAll();
          });
        }
      }
    }
  }, [step, file, previewUrl, selectedSpec]);

  useEffect(() => {
    if (fabricCanvas.current) {
      fabricCanvas.current.backgroundColor = bgColor === 'transparent' ? undefined : bgColor;
      fabricCanvas.current.renderAll();
    }
  }, [bgColor]);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setFileSizeKb(Math.round((selectedFile.size / 1024) * 100) / 100);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    setStep('edit');
  };

  const handleRemoveBackground = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/remove-bg', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Background removal failed');
      const blob = await res.blob();
      const newFile = new File([blob], 'nobg.png', { type: 'image/png' });
      setFile(newFile);
      setFileSizeKb(Math.round((blob.size / 1024) * 100) / 100);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      if (fabricCanvas.current) {
        fabricCanvas.current.clear();
        FabricImage.fromURL(url).then(img => {
          img.scaleToWidth(220);
          fabricCanvas.current?.add(img);
          fabricCanvas.current?.centerObject(img);
          fabricCanvas.current?.renderAll();
        });
      }
    } catch (err: any) {
      alert(err.message || 'Error processing background removal');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveEdit = () => {
    if (fabricCanvas.current) {
      const dataURL = fabricCanvas.current.toDataURL({ format: 'jpeg', quality: 0.95 });
      setPreviewUrl(dataURL);
    }
    setStep('summary');
  };

  const handlePaperSelect = (paper: typeof PAPER_SIZES[0]) => {
    setSelectedPaper(paper);
    setCopies(paper.maxCopies);
    setStep('print_grid');
  };

  const handlePrintAction = () => {
    window.print();
  };

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-slate-100 text-slate-900 flex flex-col justify-between font-sans selection:bg-blue-500 selection:text-white shadow-2xl overflow-hidden">
      
      {/* ================= STEP 1: UPLOAD ================= */}
      {step === 'upload' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3.5 flex items-center justify-between shadow-sm shrink-0">
            <button onClick={onBack} className="p-1 cursor-pointer"><X className="w-5 h-5" /></button>
            <h1 className="font-bold text-sm"><span className="text-red-400 font-black">Step 1:</span> Select Spec & Photo</h1>
            <div className="w-5" />
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            <div className="bg-white p-4 rounded-2xl shadow-xs space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Country / Document Spec ({selectedSpec.widthMm}x{selectedSpec.heightMm}mm)</label>
              <select
                onChange={(e) => setSelectedSpec(PASSPORT_SPECS[Number(e.target.value)])}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800"
              >
                {PASSPORT_SPECS.map((s, i) => (
                  <option key={i} value={i}>{s.country} - {s.document} ({s.widthMm}x{s.heightMm}mm)</option>
                ))}
              </select>
            </div>

            <label className="bg-white border-2 border-dashed border-blue-400 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/50 transition-colors shadow-xs">
              <Upload className="w-10 h-10 text-blue-600 mb-2" />
              <span className="font-bold text-xs text-slate-800">Upload Portrait Photo</span>
              <span className="text-[10px] text-slate-400 mt-1">Optional if carried over from editor</span>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            </label>
          </div>
        </div>
      )}

      {/* ================= STEP 2: EDIT ================= */}
      {step === 'edit' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3.5 flex items-center justify-between shadow-sm shrink-0">
            <button onClick={() => setStep('upload')} className="p-1 cursor-pointer"><X className="w-6 h-6" /></button>
            <h1 className="font-bold text-base tracking-wide"><span className="text-red-400 font-black">Step 2:</span> Edit Photo</h1>
            <button onClick={handleSaveEdit} className="bg-white text-blue-600 font-bold px-4 py-1.5 rounded-full text-xs shadow-sm hover:bg-blue-50 transition-colors cursor-pointer">
              Save
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-y-auto">
            <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 relative flex items-center justify-center">
              <canvas ref={canvasRef} className="rounded object-contain" />
              <button onClick={() => { if (fabricCanvas.current) { const obj = fabricCanvas.current.getObjects()[0]; if (obj) { obj.rotate((obj.angle || 0) + 90); fabricCanvas.current.renderAll(); } }}} className="absolute bottom-4 right-4 bg-white/90 p-2.5 rounded-full shadow-md text-slate-700 hover:bg-white cursor-pointer border border-slate-200" title="Rotate">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-white border-t border-slate-200 shadow-lg shrink-0">
            {activeBottomTool === 'background' && (
              <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50">
                <div className="flex text-xs font-bold border-b border-slate-200 pb-1.5">
                  <button onClick={() => setColorTab('basic')} className={`flex-1 pb-1 text-center ${colorTab === 'basic' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Basic & Custom</button>
                  <button onClick={() => setColorTab('premium')} className={`flex-1 pb-1 text-center flex items-center justify-center gap-1 ${colorTab === 'premium' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-400'}`}>👑 Premium</button>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-thin">
                  {EXTENDED_COLORS.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setBgColor(c.hex)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 shadow-2xs ${bgColor === c.hex ? 'border-blue-600 ring-2 ring-blue-300 text-blue-600' : 'border-slate-300 text-slate-700'}`}
                      style={{ backgroundColor: c.hex === 'transparent' ? '#0f172a' : c.hex, color: ['#ffffff', '#38bdf8', '#f1f5f9'].includes(c.hex) ? '#0f172a' : '#ffffff' }}
                    >
                      {c.name}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 flex-shrink-0 bg-white px-2 py-1 rounded-xl border border-slate-300">
                    <span className="text-[10px] font-bold">Custom:</span>
                    <input type="color" value={bgColor.startsWith('#') ? bgColor : '#ffffff'} onChange={(e) => setBgColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 py-2.5 px-2 bg-white text-center text-[10px] font-bold text-slate-700">
              <button onClick={() => { setActiveBottomTool('remove_bg'); handleRemoveBackground(); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeBottomTool === 'remove_bg' ? 'text-blue-600 bg-blue-50' : 'hover:bg-slate-50'}`}>
                <Scissors className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Remove Bg</span>
              </button>
              <button onClick={() => setActiveBottomTool('adjust')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeBottomTool === 'adjust' ? 'text-blue-600 bg-blue-50' : 'hover:bg-slate-50'}`}>
                <Sliders className="w-5 h-5" />
                <span>Adjust</span>
              </button>
              <button onClick={() => setActiveBottomTool('background')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeBottomTool === 'background' ? 'text-blue-600 bg-blue-50' : 'hover:bg-slate-50'}`}>
                <div className="w-5 h-5 rounded border border-blue-600 bg-gradient-to-tr from-blue-500 to-indigo-500" />
                <span>Background</span>
              </button>
              <button onClick={() => setActiveBottomTool('beauty')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeBottomTool === 'beauty' ? 'text-blue-600 bg-blue-50' : 'hover:bg-slate-50'}`}>
                <Sparkles className="w-5 h-5" />
                <span>Beauty</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 3: SUMMARY & PRINT SETUP ================= */}
      {step === 'summary' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3.5 flex items-center justify-between shadow-sm shrink-0">
            <button onClick={() => setStep('edit')} className="p-1 cursor-pointer"><X className="w-6 h-6" /></button>
            <h1 className="font-bold text-sm"><span className="text-red-400 font-black">Step 3:</span> Review & Print</h1>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 cursor-pointer" />
              <Home onClick={onBack} className="w-4 h-4 cursor-pointer" />
            </div>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto flex flex-col items-center justify-center">
            <div className="w-full bg-slate-200/80 border border-slate-300 rounded-2xl p-3 flex justify-between items-center text-xs font-bold text-slate-800 shadow-2xs">
              <div>
                <span className="text-[10px] text-slate-500 block font-normal">Photo {selectedSpec.widthMm}x{selectedSpec.heightMm}mm</span>
                <span>{selectedSpec.widthMm} x {selectedSpec.heightMm}mm</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block font-normal">File size :-</span>
                <span>{fileSizeKb} KB</span>
              </div>
            </div>

            <div className="w-full bg-white p-6 rounded-3xl shadow-md border border-slate-200 flex items-center justify-center relative">
              {previewUrl && <img src={previewUrl} alt="Passport" className="max-h-56 object-contain rounded shadow-sm" />}
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              <button onClick={() => alert('Annotation tool')} className="bg-slate-200 hover:bg-slate-300 text-slate-800 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-2xs cursor-pointer">
                <Edit3 className="w-4 h-4" /> Annotation
              </button>
              <button onClick={() => { if (previewUrl) { const a = document.createElement('a'); a.href = previewUrl; a.download = 'passport.jpg'; a.click(); } }} className="bg-slate-200 hover:bg-slate-300 text-slate-800 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-2xs cursor-pointer">
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>

            <button onClick={() => setStep('paper_size')} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-98">
              <Printer className="w-5 h-5" /> Print
            </button>
          </div>
        </div>
      )}

      {step === 'paper_size' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3.5 flex items-center justify-between shadow-sm shrink-0">
            <button onClick={() => setStep('summary')} className="p-1 cursor-pointer">←</button>
            <h1 className="font-bold text-base">Select Paper Size</h1>
            <div className="w-5" />
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {PAPER_SIZES.map((paper, idx) => (
              <button key={idx} onClick={() => handlePaperSelect(paper)} className="w-full bg-white hover:bg-blue-50/50 p-4 rounded-2xl border border-slate-200 shadow-2xs text-left flex items-center gap-4 transition-all cursor-pointer group">
                <div className="w-10 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-xs">📄</div>
                <div>
                  <div className="font-bold text-sm text-slate-900 group-hover:text-blue-600">{paper.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{paper.widthMm}mm x {paper.heightMm}mm (Max {paper.maxCopies} copies)</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'print_grid' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden printable-sheet">
          <div className="bg-blue-600 text-white px-4 py-3.5 flex items-center justify-between shadow-sm shrink-0 print:hidden">
            <button onClick={() => setStep('paper_size')} className="p-1 cursor-pointer">←</button>
            <h1 className="font-bold text-base">Select Paper Size</h1>
            <button onClick={() => setIsLandscape(!isLandscape)} className="p-1 cursor-pointer" title="Rotate Sheet">
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 flex-1 flex flex-col space-y-3 overflow-hidden">
            <div onClick={() => setStep('paper_size')} className="bg-slate-200/90 hover:bg-slate-300 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-800 shadow-2xs cursor-pointer transition-colors shrink-0 print:hidden">
              <span>{selectedPaper.name} <span className="font-normal text-slate-500">{selectedPaper.widthMm}mm x {selectedPaper.heightMm}mm</span></span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </div>

            {/* Fixed Height Scrollable Grid Container so page doesn't stretch downwards */}
            <div className="h-64 sm:h-72 bg-white border border-slate-300 rounded-3xl p-3 overflow-y-auto flex items-center justify-center shadow-inner shrink-0">
              <div
                className="grid bg-white p-2 border border-dashed border-slate-300 rounded-xl transition-all shadow-sm"
                style={{
                  gridTemplateColumns: `repeat(${selectedPaper.defaultCols}, minmax(0, 1fr))`,
                  gap: `${Math.max(1, spacing)}px`
                }}
              >
                {Array.from({ length: Math.min(copies, selectedPaper.maxCopies) }).map((_, i) => (
                  <div key={i} className="relative w-9 h-13 bg-white rounded border border-slate-400 overflow-hidden shadow-2xs flex items-center justify-center p-0.5">
                    {previewUrl && <img src={previewUrl} alt="Passport" className="w-full h-full object-contain" />}
                    <div className="absolute top-0.5 left-0.5 w-1 h-1 border-t border-l border-slate-500 pointer-events-none" />
                    <div className="absolute top-0.5 right-0.5 w-1 h-1 border-t border-r border-slate-500 pointer-events-none" />
                    <div className="absolute bottom-0.5 left-0.5 w-1 h-1 border-b border-l border-slate-500 pointer-events-none" />
                    <div className="absolute bottom-0.5 right-0.5 w-1 h-1 border-b border-r border-slate-500 pointer-events-none" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0 print:hidden">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                <button onClick={() => setSpacing(Math.max(0, spacing - 1))} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center font-bold text-base text-slate-700 cursor-pointer">−</button>
                <span className="text-xs font-bold text-slate-800">Spacing {spacing}</span>
                <button onClick={() => setSpacing(spacing + 1)} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center font-bold text-base text-slate-700 cursor-pointer">+</button>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                <button onClick={() => setCopies(Math.max(1, copies - 1))} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center font-bold text-base text-slate-700 cursor-pointer">−</button>
                <span className="text-xs font-bold text-slate-800">Copies {copies}</span>
                <button onClick={() => setCopies(Math.min(selectedPaper.maxCopies, copies + 1))} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center font-bold text-base text-slate-700 cursor-pointer">+</button>
              </div>
            </div>

            <p className="text-[10px] text-center text-slate-500 print:hidden">Try long pressing '-' or '+' to quickly adjust copies</p>

            <button onClick={handlePrintAction} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-98 shrink-0 print:hidden">
              <Printer className="w-5 h-5" /> Print Multiple Copies
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
