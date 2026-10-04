// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Check, Sparkles, Sliders, Download, Printer, Scissors, ZoomIn, ZoomOut, RotateCw, RefreshCw, X, Home, MessageSquare, Share2, Edit3, Plus, Minus, ChevronRight, PenTool, UserCheck, UserPlus, Image, Settings, FileImage } from 'lucide-react';
import { Canvas, Image as FabricImage } from 'fabric';
import { PassportDocumentSpec, PASSPORT_SPECS } from '../../types/passport';
import { saveActiveImageStorage, loadActiveImageStorage } from '../../../services/activeImageStorage';

interface PassportToolProps {
  initialFile?: File | null;
  onBack: () => void;
}

const PAPER_SIZES = [
  { name: '3R', widthMm: 89, heightMm: 127 },
  { name: '4R', widthMm: 102, heightMm: 152 },
  { name: '5R', widthMm: 127, heightMm: 178 },
  { name: '6R', widthMm: 152, heightMm: 203 },
  { name: '8R', widthMm: 203, heightMm: 254 },
  { name: 'A4', widthMm: 210, heightMm: 297 },
  { name: 'S8R', widthMm: 203, heightMm: 305 },
  { name: '10R', widthMm: 254, heightMm: 305 },
  { name: 'Long', widthMm: 102, heightMm: 210 },
  { name: 'Other', widthMm: 150, heightMm: 150 },
  { name: 'Custom', widthMm: 100, heightMm: 150 },
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
  
  // Checkbox option for automatic background removal
  const [autoRemoveBg, setAutoRemoveBg] = useState<boolean>(true);

  const [selectedPaper, setSelectedPaper] = useState(PAPER_SIZES[1]);
  const [copies, setCopies] = useState<number>(8);
  const [spacing, setSpacing] = useState<number>(2);
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const [cutGuide, setCutGuide] = useState<'off' | 'corners' | 'lines'>('corners');
  const [exportFormat, setExportFormat] = useState<'JPG' | 'PNG' | 'PDF'>('JPG');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Custom size state
  const [customWidth, setCustomWidth] = useState<number>(35);
  const [customHeight, setCustomHeight] = useState<number>(45);
  const [unit, setUnit] = useState<'mm' | 'cm' | 'inch'>('mm');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);

  // Phone storage & IndexedDB persistence: load cached working photo if available
  useEffect(() => {
    if (initialFile) {
      setFile(initialFile);
      setFileSizeKb(Math.round((initialFile.size / 1024) * 100) / 100);
      const url = URL.createObjectURL(initialFile);
      setPreviewUrl(url);
      setStep('edit');
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          saveActiveImageStorage(e.target.result as string, { name: initialFile.name, service: 'passport' });
        }
      };
      reader.readAsDataURL(initialFile);
    } else {
      loadActiveImageStorage().then((cached) => {
        if (cached && cached.dataUrl) {
          setPreviewUrl(cached.dataUrl);
          fetch(cached.dataUrl)
            .then(res => res.blob())
            .then(blob => {
              const cachedFile = new File([blob], cached.metadata?.name || 'cached_photo.png', { type: 'image/png' });
              setFile(cachedFile);
              setFileSizeKb(Math.round((blob.size / 1024) * 100) / 100);
            })
            .catch(() => {});
        }
      });
    }
  }, [initialFile]);

  // Dynamic calculation of cols, rows, and copies based on sheet size vs photo size
  useEffect(() => {
    const sheetW = isLandscape ? selectedPaper.heightMm : selectedPaper.widthMm;
    const sheetH = isLandscape ? selectedPaper.widthMm : selectedPaper.heightMm;
    const pW = selectedSpec.widthMm;
    const pH = selectedSpec.heightMm;
    const gap = spacing;
    const margin = 5; // 5mm margin

    const usableW = sheetW - (margin * 2);
    const usableH = sheetH - (margin * 2);

    const cols = Math.max(1, Math.floor((usableW + gap) / (pW + gap)));
    const rows = Math.max(1, Math.floor((usableH + gap) / (pH + gap)));
    const total = cols * rows;
    setCopies(total > 0 ? total : 8);
  }, [selectedPaper, selectedSpec, spacing, isLandscape]);

  // Safe image loader for Fabric.js to prevent blob loading errors
  const loadFabricImg = (srcUrl: string): Promise<FabricImage> => {
    return new Promise((resolve, reject) => {
      FabricImage.fromURL(srcUrl)
        .then((fabricImg) => resolve(fabricImg))
        .catch((err) => reject(err));
    });
  };

  // Initialize canvas
  useEffect(() => {
    if (step === 'edit' && canvasRef.current && !fabricCanvas.current) {
      const cWidth = 260;
      const cHeight = Math.round(cWidth * (selectedSpec.heightMm / selectedSpec.widthMm));

      fabricCanvas.current = new Canvas(canvasRef.current, {
        width: cWidth,
        height: cHeight,
        backgroundColor: bgColor === 'transparent' ? undefined : bgColor
      });
    }
  }, [step, selectedSpec]);

  // Update canvas image when file or previewUrl changes
  useEffect(() => {
    if (step === 'edit' && fabricCanvas.current && (file || previewUrl)) {
      const url = previewUrl || (file ? URL.createObjectURL(file) : '');
      if (url) {
        fabricCanvas.current.clear();
        loadFabricImg(url).then(img => {
          img.scaleToWidth(260 * 0.85);
          fabricCanvas.current?.add(img);
          fabricCanvas.current?.centerObject(img);
          fabricCanvas.current?.renderAll();
        }).catch(err => console.warn('Fabric image update error:', err));
      }
    }
  }, [step, file, previewUrl]);

  useEffect(() => {
    if (fabricCanvas.current) {
      fabricCanvas.current.backgroundColor = bgColor === 'transparent' ? undefined : bgColor;
      fabricCanvas.current.renderAll();
    }
  }, [bgColor]);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setFileSizeKb(Math.round((selectedFile.size / 1024) * 100) / 100);
    
    let workingFile = selectedFile;
    let url = URL.createObjectURL(selectedFile);

    // If autoRemoveBg checkbox is checked, run background removal immediately
    if (autoRemoveBg) {
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        const res = await fetch('/api/remove-bg', { method: 'POST', body: formData });
        if (res.ok) {
          const blob = await res.blob();
          workingFile = new File([blob], 'nobg.png', { type: 'image/png' });
          setFile(workingFile);
          setFileSizeKb(Math.round((blob.size / 1024) * 100) / 100);
          url = URL.createObjectURL(blob);
        }
      } catch (err) {
        console.warn('Auto background removal fallback:', err);
      } finally {
        setIsProcessing(false);
      }
    }

    setPreviewUrl(url);
    setStep('edit');

    // Cache in IndexedDB / localStorage storage service
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        saveActiveImageStorage(e.target.result as string, { name: workingFile.name, service: 'passport' });
      }
    };
    reader.readAsDataURL(workingFile);
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
        loadFabricImg(url).then(img => {
          img.scaleToWidth(220);
          fabricCanvas.current?.add(img);
          fabricCanvas.current?.centerObject(img);
          fabricCanvas.current?.renderAll();
        }).catch(err => console.warn('Fabric image load error:', err));
      }
    } catch (err: any) {
      alert(err.message || 'Error processing background removal');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const sheetW = isLandscape ? selectedPaper.heightMm : selectedPaper.widthMm;
      const sheetH = isLandscape ? selectedPaper.widthMm : selectedPaper.heightMm;
      const pW = selectedSpec.widthMm;
      const pH = selectedSpec.heightMm;
      const usableW = sheetW - 10;
      const cols = Math.max(1, Math.floor((usableW + spacing) / (pW + spacing)));

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Passport Photos - ${selectedPaper.name} (${copies} Copies) - 300 DPI</title>
            <style>
              @page { size: ${sheetW}mm ${sheetH}mm; margin: 0; }
              body { font-family: sans-serif; margin: 0; padding: 5mm; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; box-sizing: border-box; }
              .sheet {
                display: grid;
                grid-template-columns: repeat(${cols}, ${pW}mm);
                gap: ${spacing}mm;
                width: ${sheetW}mm;
                height: ${sheetH}mm;
                box-sizing: border-box;
                padding: 5mm;
                align-content: start;
              }
              .photo-box {
                width: ${pW}mm;
                height: ${pH}mm;
                box-sizing: border-box;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #fff;
                ${cutGuide === 'lines' ? 'border: 1px dashed #94a3b8;' : ''}
                ${cutGuide === 'corners' ? 'outline: 1px dotted #64748b;' : ''}
              }
              img { width: 100%; height: 100%; object-fit: contain; }
            </style>
          </head>
          <body>
            <div class="sheet">
              ${Array.from({ length: Math.min(copies, 60) }).map(() => `
                <div class="photo-box">
                  ${previewUrl ? `<img src="${previewUrl}" />` : ''}
                </div>
              `).join('')}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 400);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const handleSaveEdit = () => {
    if (fabricCanvas.current) {
      const dataURL = fabricCanvas.current.toDataURL({ format: 'jpeg', quality: 0.95 });
      setPreviewUrl(dataURL);
    }
    setStep('summary');
  };

  // Sheet column calculation for preview
  const sheetW = isLandscape ? selectedPaper.heightMm : selectedPaper.widthMm;
  const sheetH = isLandscape ? selectedPaper.widthMm : selectedPaper.heightMm;
  const usableW = sheetW - 10;
  const previewCols = Math.max(1, Math.floor((usableW + spacing) / (selectedSpec.widthMm + spacing)));

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-[#f8fafc] text-slate-800 flex flex-col justify-between font-sans selection:bg-blue-500 selection:text-white shadow-2xl overflow-hidden">
      
      {/* ================= HOME / UPLOAD ================= */}
      {step === 'upload' && (
        <div className="flex-1 flex flex-col bg-[#f8fafc] text-slate-800 overflow-y-auto">
          <div className="px-4 py-4 flex items-center justify-between bg-[#f8fafc] sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="p-1 cursor-pointer text-slate-600 hover:text-slate-900"><X className="w-6 h-6" /></button>
              <h1 className="font-extrabold text-lg text-slate-800 tracking-tight">Passport Photo</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-3 py-1.5 rounded-full text-xs flex items-center gap-1 shadow-xs cursor-pointer">
                <span>👑</span> Pro
              </button>
              <button className="p-2 bg-white rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-2xs cursor-pointer">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-6">
            <div className="grid grid-cols-4 gap-2.5">
              <div onClick={() => alert('Custom')} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 mb-1.5">
                  <Scissors className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Custom</span>
              </div>
              <div onClick={() => alert('Annotation')} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 mb-1.5">
                  <Edit3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Annotation</span>
              </div>
              <div onClick={() => alert('Signature')} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 mb-1.5">
                  <PenTool className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Signature</span>
              </div>
              <div onClick={() => alert('Sign Photo')} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 mb-1.5">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Sign Photo</span>
              </div>
            </div>

            {/* Background Removal Checkbox Option */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
              <span className="text-xs font-bold text-slate-800">Remove Background automatically</span>
              <input
                type="checkbox"
                checked={autoRemoveBg}
                onChange={(e) => setAutoRemoveBg(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl shadow-md flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-98">
                <div className="w-10 h-10 rounded-xl bg-blue-500/40 flex items-center justify-center text-white mb-2">
                  <UserPlus className="w-6 h-6" />
                </div>
                <span className="font-extrabold text-sm tracking-wide">
                  {isProcessing ? 'Processing...' : 'Create Photo'}
                </span>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
              </label>

              <button onClick={() => {
                const cached = localStorage.getItem('bigsta_active_photo');
                if (cached) {
                  fetch(cached)
                    .then(res => res.blob())
                    .then(blob => {
                      const cachedFile = new File([blob], 'saved_photo.png', { type: 'image/png' });
                      setFile(cachedFile);
                      setPreviewUrl(cached);
                      setStep('edit');
                    });
                } else {
                  alert('No recent photo in phone storage. Please upload one.');
                }
              }} className="bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl shadow-md flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-98">
                <div className="w-10 h-10 rounded-xl bg-blue-500/40 flex items-center justify-center text-white mb-2">
                  <Image className="w-6 h-6" />
                </div>
                <span className="font-extrabold text-sm tracking-wide">My Photos</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-sm text-slate-800">Universal</h2>
                <button className="text-xs font-bold text-blue-600 hover:underline">See all</button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {PASSPORT_SPECS.map((spec, idx) => (
                  <label key={idx} onClick={() => setSelectedSpec(spec)} className="flex-shrink-0 w-36 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center text-center cursor-pointer hover:border-blue-400 transition-all group">
                    <div className="w-16 h-20 bg-slate-100 rounded-lg border border-slate-200 mb-3 flex items-center justify-center relative overflow-hidden shadow-xs">
                      <div className="absolute inset-1.5 bg-slate-200 rounded flex items-end justify-center pb-1">
                        <div className="w-6 h-7 bg-slate-400 rounded-t-full" />
                      </div>
                    </div>
                    <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600 line-clamp-1">{spec.country}</span>
                    <span className="text-[10px] text-slate-400">{spec.widthMm}x{spec.heightMm}mm</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Size Engine Input */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
              <h2 className="font-extrabold text-xs text-slate-800">Custom Size</h2>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Width</label>
                  <input type="number" value={customWidth} onChange={(e) => setCustomWidth(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Height</label>
                  <input type="number" value={customHeight} onChange={(e) => setCustomHeight(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Unit</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold">
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="inch">inch</option>
                  </select>
                </div>
              </div>
              <button onClick={() => {
                let w = customWidth;
                let h = customHeight;
                if (unit === 'cm') { w *= 10; h *= 10; }
                if (unit === 'inch') { w *= 25.4; h *= 25.4; }
                setSelectedSpec({ country: 'Custom', document: 'Custom', widthMm: Math.round(w), heightMm: Math.round(h), dpi: 300, backgroundRequirements: 'any', minResolution: { width: 300, height: 400 } });
              }} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-bold">
                Apply Custom Size
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 2: EDIT ================= */}
      {step === 'edit' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3.5 flex items-center justify-between shadow-sm shrink-0">
            <button onClick={() => setStep('upload')} className="p-1 cursor-pointer"><X className="w-6 h-6" /></button>
            <h1 className="font-bold text-base tracking-wide">Edit</h1>
            <button onClick={handleSaveEdit} className="bg-white text-blue-600 font-bold px-4 py-1.5 rounded-full text-xs shadow-sm hover:bg-blue-50 transition-colors cursor-pointer">
              Save
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-y-auto">
            <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 relative flex items-center justify-center">
              <canvas ref={canvasRef} className="rounded object-contain" />
              <button onClick={() => { if (fabricCanvas.current) { const obj = fabricCanvas.current.getObjects()[0]; if (obj) { obj.rotate((obj.angle || 0) + 90); fabricCanvas.current.renderAll(); } }}} className="absolute bottom-4 right-4 bg-white/90 p-2.5 rounded-full shadow-md text-slate-700 hover:bg-white cursor-pointer border border-slate-200">
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
                <FileImage className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} />
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

      {/* ================= SUMMARY ================= */}
      {step === 'summary' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3.5 flex items-center justify-between shadow-sm shrink-0">
            <button onClick={() => setStep('edit')} className="p-1 cursor-pointer"><X className="w-6 h-6" /></button>
            <h1 className="font-bold text-base">Summary</h1>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 cursor-pointer" />
              <Home onClick={onBack} className="w-4 h-4 cursor-pointer" />
            </div>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto flex flex-col items-center justify-center">
            <div className="w-full bg-slate-200/80 border border-slate-300 rounded-2xl p-3 flex justify-between items-center text-xs font-bold text-slate-800 shadow-2xs">
              <div>
                <span className="text-[10px] text-slate-500 block font-normal">Photo Size</span>
                <span>{selectedSpec.widthMm} x {selectedSpec.heightMm} mm</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block font-normal">File size</span>
                <span>{fileSizeKb} KB</span>
              </div>
            </div>

            <div className="w-full bg-white p-6 rounded-3xl shadow-md border border-slate-200 flex items-center justify-center relative">
              {previewUrl && <img src={previewUrl} alt="Passport" className="max-h-56 object-contain rounded shadow-sm" />}
            </div>

            <button onClick={() => setStep('paper_size')} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-98">
              <Printer className="w-5 h-5" /> Select Paper & Print
            </button>
          </div>
        </div>
      )}

      {/* ================= PAPER SIZE ================= */}
      {step === 'paper_size' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3.5 flex items-center justify-between shadow-sm shrink-0">
            <button onClick={() => setStep('summary')} className="p-1 cursor-pointer">←</button>
            <h1 className="font-bold text-base">Paper Size</h1>
            <div className="w-5" />
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {PAPER_SIZES.map((paper, idx) => (
              <button key={idx} onClick={() => { setSelectedPaper(paper); setStep('print_grid'); }} className="w-full bg-white hover:bg-blue-50/50 p-4 rounded-2xl border border-slate-200 shadow-2xs text-left flex items-center gap-4 transition-all cursor-pointer group">
                <div className="w-10 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-xs">📄</div>
                <div>
                  <div className="font-bold text-sm text-slate-900 group-hover:text-blue-600">{paper.name} ({paper.widthMm}mm × {paper.heightMm}mm)</div>
                  <div className="text-xs text-slate-400 mt-0.5">Sheet Print Size</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================= PRINT GRID & SHEET ENGINE ================= */}
      {step === 'print_grid' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3.5 flex items-center justify-between shadow-sm shrink-0">
            <button onClick={() => setStep('paper_size')} className="p-1 cursor-pointer">←</button>
            <h1 className="font-bold text-base">Print Sheet</h1>
            <button onClick={() => setIsLandscape(!isLandscape)} className="p-1 cursor-pointer" title="Rotate Sheet">
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 flex-1 flex flex-col space-y-3 overflow-hidden">
            <div onClick={() => setStep('paper_size')} className="bg-slate-200/90 hover:bg-slate-300 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-800 shadow-2xs cursor-pointer transition-colors shrink-0">
              <span>{selectedPaper.name} <span className="font-normal text-slate-500">({sheetW}mm × {sheetH}mm)</span></span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </div>

            {/* Cut Guides & Format Controls */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold">
                <span>Cut Guide:</span>
                <select value={cutGuide} onChange={(e) => setCutGuide(e.target.value as any)} className="bg-slate-100 border border-slate-200 rounded p-1 text-xs">
                  <option value="off">Off</option>
                  <option value="corners">Corners</option>
                  <option value="lines">Lines</option>
                </select>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold">
                <span>Format:</span>
                <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} className="bg-slate-100 border border-slate-200 rounded p-1 text-xs">
                  <option value="JPG">JPG</option>
                  <option value="PNG">PNG</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>
            </div>

            {/* WYSIWYG Print Sheet Preview */}
            <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-3 overflow-y-auto flex items-center justify-center shadow-inner">
              <div
                className="grid gap-1 p-2 transition-all bg-slate-50 border border-slate-300 rounded"
                style={{
                  gridTemplateColumns: `repeat(${previewCols}, minmax(0, 1fr))`,
                  gap: `${Math.max(1, spacing)}px`
                }}
              >
                {Array.from({ length: Math.min(copies, 60) }).map((_, i) => (
                  <div key={i} className={`w-10 h-14 bg-white rounded flex items-center justify-center shadow-2xs overflow-hidden ${cutGuide === 'lines' ? 'border border-dashed border-slate-400' : cutGuide === 'corners' ? 'border border-dotted border-slate-500' : 'border border-slate-200'}`}>
                    {previewUrl && <img src={previewUrl} alt="Passport" className="w-full h-full object-contain" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                <button onClick={() => setSpacing(Math.max(0, spacing - 1))} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center font-bold text-base text-slate-700 cursor-pointer">−</button>
                <span className="text-xs font-bold text-slate-800">Spacing {spacing}mm</span>
                <button onClick={() => setSpacing(spacing + 1)} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center font-bold text-base text-slate-700 cursor-pointer">+</button>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                <button onClick={() => setCopies(Math.max(1, copies - 1))} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center font-bold text-base text-slate-700 cursor-pointer">−</button>
                <span className="text-xs font-bold text-slate-800">Copies {copies}</span>
                <button onClick={() => setCopies(copies + 1)} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center font-bold text-base text-slate-700 cursor-pointer">+</button>
              </div>
            </div>

            <button onClick={handlePrint} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-98 shrink-0">
              <Printer className="w-5 h-5" /> Print Sheet (300 DPI - 100% Scale)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
