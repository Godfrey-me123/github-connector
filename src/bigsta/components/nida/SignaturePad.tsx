import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PenTool,
  Upload,
  RotateCcw,
  Eraser,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileSignature,
  Sparkles,
  Save,
} from 'lucide-react';

const MAX_SIG_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_SIG_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface SignaturePadProps {
  value?: string | null;
  onChange: (signatureDataUrl: string | null) => void;
  disabled?: boolean;
}

type Point = { x: number; y: number };
type Stroke = Point[];

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [activeMethod, setActiveMethod] = useState<'draw' | 'upload'>('draw');
  const [error, setError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Stroke history
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke>([]);
  const isDrawingRef = useRef<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Helper: Generate crisp transparent PNG data URL with bounding box padding
  const exportTransparentSignature = useCallback((strokes: Stroke[]): string | null => {
    if (!strokes || strokes.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let totalPoints = 0;

    strokes.forEach((stroke) => {
      stroke.forEach((pt) => {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
        totalPoints++;
      });
    });

    if (totalPoints === 0 || !isFinite(minX) || !isFinite(minY)) {
      return null;
    }

    const padding = 16;
    const rawWidth = Math.max(maxX - minX + padding * 2, 80);
    const rawHeight = Math.max(maxY - minY + padding * 2, 40);

    // Export at high resolution (2x for crisp anti-aliased lines)
    const scale = 2;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = rawWidth * scale;
    exportCanvas.height = rawHeight * scale;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    // Strict No-Background / Pure Alpha Transparency
    ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.scale(scale, scale);

    // High quality dark ink stroke
    ctx.strokeStyle = '#050608';
    ctx.fillStyle = '#050608';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    strokes.forEach((stroke) => {
      if (stroke.length === 0) return;

      if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke[0].x + offsetX, stroke[0].y + offsetY, 1.8, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(stroke[0].x + offsetX, stroke[0].y + offsetY);

      for (let i = 1; i < stroke.length; i++) {
        const p1 = stroke[i - 1];
        const p2 = stroke[i];
        const midPointX = (p1.x + p2.x) / 2 + offsetX;
        const midPointY = (p1.y + p2.y) / 2 + offsetY;
        ctx.quadraticCurveTo(p1.x + offsetX, p1.y + offsetY, midPointX, midPointY);
      }
      const last = stroke[stroke.length - 1];
      ctx.lineTo(last.x + offsetX, last.y + offsetY);
      ctx.stroke();
    });

    // Export as transparent PNG
    return exportCanvas.toDataURL('image/png');
  }, []);

  // Helper: Redraw all strokes on interactive canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas maintaining transform
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Signature visual stroke style on pad
    ctx.strokeStyle = '#050608';
    ctx.fillStyle = '#050608';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokesRef.current.forEach((stroke) => {
      if (stroke.length === 0) return;

      if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);

      for (let i = 1; i < stroke.length; i++) {
        const p1 = stroke[i - 1];
        const p2 = stroke[i];
        const midPointX = (p1.x + p2.x) / 2;
        const midPointY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x, p1.y, midPointX, midPointY);
      }
      const last = stroke[stroke.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    });
  }, []);

  // Setup canvas resolution and coordinate mapping
  const resizeAndSetupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = containerRef.current;
    const rect = container ? container.getBoundingClientRect() : canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(rect.width);
    const displayHeight = Math.floor(rect.height);

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    redrawCanvas();
  }, [redrawCanvas]);

  // Setup ResizeObserver for robust layout adaptation on mobile orientation / keyboards
  useEffect(() => {
    if (activeMethod !== 'draw') return;

    const container = containerRef.current;
    if (!container) return;

    resizeAndSetupCanvas();

    const resizeObserver = new ResizeObserver(() => {
      resizeAndSetupCanvas();
    });
    resizeObserver.observe(container);

    window.addEventListener('resize', resizeAndSetupCanvas);
    window.addEventListener('orientationchange', resizeAndSetupCanvas);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeAndSetupCanvas);
      window.removeEventListener('orientationchange', resizeAndSetupCanvas);
    };
  }, [activeMethod, resizeAndSetupCanvas]);

  // Direct calibrated coordinates calculation
  const getCanvasCoordinates = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e && 'clientY' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    } else {
      return null;
    }

    // Precise canvas-local coordinates accounting for rect position and CSS scaling
    const scaleX = canvas.clientWidth > 0 ? canvas.clientWidth / rect.width : 1;
    const scaleY = canvas.clientHeight > 0 ? canvas.clientHeight / rect.height : 1;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Constrain within visible canvas
    return {
      x: Math.max(0, Math.min(x, canvas.clientWidth)),
      y: Math.max(0, Math.min(y, canvas.clientHeight)),
    };
  }, []);

  // Drawing start handler
  const handleStart = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    const pt = getCanvasCoordinates(e);
    if (!pt) return;

    isDrawingRef.current = true;
    setIsDrawing(true);
    setError(null);
    setSaveSuccess(false);

    currentStrokeRef.current = [pt];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#050608';
    ctx.fillStyle = '#050608';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  }, [disabled, getCanvasCoordinates]);

  // Drawing move handler
  const handleMove = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || disabled) return;
    const pt = getCanvasCoordinates(e);
    if (!pt) return;

    currentStrokeRef.current.push(pt);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stroke = currentStrokeRef.current;
    if (stroke.length > 2) {
      const p1 = stroke[stroke.length - 2];
      const p2 = stroke[stroke.length - 1];
      const midPointX = (p1.x + p2.x) / 2;
      const midPointY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, midPointX, midPointY);
      ctx.stroke();
    } else if (stroke.length === 2) {
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  }, [disabled, getCanvasCoordinates]);

  // Drawing end handler (Direct application)
  const handleEnd = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);

    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push([...currentStrokeRef.current]);
      currentStrokeRef.current = [];
      const newCount = strokesRef.current.length;
      setStrokeCount(newCount);

      // DIRECT APPLY: Generate transparent PNG with NO background and apply instantly
      const transparentDataUrl = exportTransparentSignature(strokesRef.current);
      if (transparentDataUrl) {
        onChange(transparentDataUrl);
      }
    }
  }, [exportTransparentSignature, onChange]);

  // Attach native non-passive touch listeners to guarantee zero lag and NO page scrolling while drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeMethod !== 'draw') return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleStart(e);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e);
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    };

    const onTouchCancel = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchCancel, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [activeMethod, handleStart, handleMove, handleEnd]);

  // Undo button: updates strokes and DIRECTLY applies
  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    const newCount = strokesRef.current.length;
    setStrokeCount(newCount);
    redrawCanvas();
    setSaveSuccess(false);

    if (newCount > 0) {
      const transparentDataUrl = exportTransparentSignature(strokesRef.current);
      onChange(transparentDataUrl);
    } else {
      onChange(null);
    }
  };

  // Clear button: clears canvas and DIRECTLY updates value to null
  const handleClear = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setStrokeCount(0);
    redrawCanvas();
    onChange(null);
    setError(null);
    setSaveSuccess(false);
  };

  // Explicit Save / Confirm button (Provides instant feedback)
  const handleExplicitSave = () => {
    if (strokesRef.current.length === 0) {
      setError('Please draw your signature before saving.');
      return;
    }
    const transparentDataUrl = exportTransparentSignature(strokesRef.current);
    if (transparentDataUrl) {
      onChange(transparentDataUrl);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  // Upload handler: READ DIRECTLY WITHOUT ALTERING TRANSPARENCY
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSaveSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_SIG_TYPES.includes(file.type.toLowerCase())) {
      setError('Unsupported signature format. Please upload JPG, JPEG, PNG, or WEBP.');
      return;
    }

    if (file.size > MAX_SIG_SIZE) {
      setError('Signature file is too large. Maximum allowed size is 10MB.');
      return;
    }

    // Read directly as DataURL - DO NOT ALTER RAW TRANSPARENCY
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      if (dataUrl) {
        onChange(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  };

  const handleRemoveSignature = () => {
    onChange(null);
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setStrokeCount(0);
    redrawCanvas();
    setError(null);
    setSaveSuccess(false);
  };

  return (
    <div className="w-full space-y-3 font-sans">
      {/* Hidden upload input */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleSignatureUpload}
        disabled={disabled}
      />

      {/* Main Signature Card */}
      <div className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl space-y-4 shadow-xs">
        {/* Card Header & Method Tabs */}
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#C8C2BE] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#101010]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
              Signature System
            </h2>
          </div>

          <div className="flex items-center bg-[#E7E2DE] p-0.5 rounded-xl border border-[#C8C2BE]">
            <button
              type="button"
              onClick={() => {
                setActiveMethod('draw');
                setError(null);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer min-h-[32px] ${
                activeMethod === 'draw'
                  ? 'bg-[#101010] text-white shadow-xs'
                  : 'text-[#101010]/70 hover:text-[#101010]'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Draw Direct</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMethod('upload');
                setError(null);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer min-h-[32px] ${
                activeMethod === 'upload'
                  ? 'bg-[#101010] text-white shadow-xs'
                  : 'text-[#101010]/70 hover:text-[#101010]'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </button>
          </div>
        </div>

        {/* DRAW MODE (Calibrated touch canvas with instant direct apply & explicit controls) */}
        {activeMethod === 'draw' ? (
          <div className="space-y-3">
            <div
              ref={containerRef}
              className="relative bg-white rounded-2xl overflow-hidden border border-[#C8C2BE] shadow-xs select-none h-36 sm:h-44"
              style={{ touchAction: 'none' }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                className="w-full h-full cursor-crosshair block"
                style={{ touchAction: 'none' }}
              />

              {/* Signature Baseline Guide */}
              <div className="absolute bottom-8 left-8 right-8 border-b border-dashed border-slate-300 pointer-events-none flex justify-between">
                <span className="text-[10px] text-slate-400 font-mono -mt-4">Sign above line</span>
                <span className="text-[10px] text-slate-400 font-mono -mt-4">X</span>
              </div>

              {/* Top status indicator */}
              <div className="absolute top-2.5 left-3 pointer-events-none text-[10px] font-sans flex items-center gap-1.5">
                {strokeCount > 0 ? (
                  null
                ) : (
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <PenTool className="w-3 h-3 text-[#101010]" />
                    <span>Touch or click to sign (tracks finger directly)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Drawing Controls Bar (Fully responsive on mobile devices) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Undo Button */}
                <button
                  id="sig-undo-btn"
                  type="button"
                  onClick={handleUndo}
                  disabled={disabled || strokeCount === 0}
                  className="min-h-[38px] py-1.5 px-3.5 bg-[#FFFFFF] hover:bg-[#F5F2EF] border border-[#C8C2BE] text-[#101010] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer active:scale-95 shadow-xs"
                  title="Undo last stroke"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#101010]" />
                  <span>Undo</span>
                </button>

                {/* Clear Button */}
                <button
                  id="sig-clear-btn"
                  type="button"
                  onClick={handleClear}
                  disabled={disabled || (strokeCount === 0 && !value)}
                  className="min-h-[38px] py-1.5 px-3.5 bg-[#FFFFFF] hover:bg-[#F5F2EF] border border-[#C8C2BE] text-[#101010] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer active:scale-95 shadow-xs"
                  title="Clear signature"
                >
                  <Eraser className="w-3.5 h-3.5 text-[#FF6839]" />
                  <span>Clear</span>
                </button>

                {/* Save / Apply Confirmation Button */}
                <button
                  id="sig-save-btn"
                  type="button"
                  onClick={handleExplicitSave}
                  disabled={disabled || strokeCount === 0}
                  className={`min-h-[38px] py-1.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    saveSuccess
                      ? 'bg-emerald-700 text-white shadow-md'
                      : 'bg-[#101010] hover:bg-[#252525] text-white disabled:opacity-40'
                  }`}
                  title="Save signature stroke"
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-white" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>

              {/* Direct status badge */}
              <div className="text-[11px] text-[#101010]/70 font-semibold flex items-center gap-1.5 ml-auto">
                {value ? (
                  null
                ) : (
                  <span className="text-[#101010]/60 font-medium">Ready to sign</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* UPLOAD MODE (Original transparent PNG preservation) */
          <div className="space-y-3">
            {value ? (
              /* Uploaded Signature Preview with Transparency Grid */
              <div className="space-y-3">
                <div className="relative p-4 bg-white rounded-2xl border-2 border-[#101010] shadow-md flex flex-col items-center justify-center min-h-[140px] overflow-hidden">
                  {/* Subtle checkered transparency background */}
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    }}
                  />

                  <img
                    src={value}
                    alt="Signature Preview"
                    className="max-h-24 max-w-full object-contain relative z-10"
                  />

                  {/* Verified Stamp */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>Original Transparency Preserved</span>
                  </div>

                  <div className="w-3/4 border-b border-dashed border-slate-300 mt-2 relative z-10" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs text-[#101010]/70 font-medium flex items-center gap-1.5">
                    <FileSignature className="w-3.5 h-3.5 text-[#101010] shrink-0" />
                    <span className="truncate">File uploaded without background alteration</span>
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="py-1.5 px-3 bg-[#FFFFFF] hover:bg-[#F5F2EF] text-[#101010] rounded-xl text-xs font-bold border border-[#C8C2BE] flex items-center gap-1.5 transition-all cursor-pointer min-h-[36px] shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#101010]" />
                      <span>Replace</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveSignature}
                      className="py-1.5 px-3 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold border border-rose-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 min-h-[36px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Dropzone for Uploading */
              <div className="space-y-3">
                <div
                  onClick={() => !disabled && uploadInputRef.current?.click()}
                  className="border-2 border-dashed border-[#C8C2BE] hover:border-[#101010] hover:bg-[#E7E2DE]/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#E7E2DE] border border-[#C8C2BE] group-hover:border-[#101010] flex items-center justify-center mb-2.5 shadow-xs">
                    <Upload className="w-5 h-5 text-[#101010] group-hover:scale-110 transition-transform" />
                  </div>
                  <h4 className="text-xs font-bold text-[#101010]">
                    Upload Signature Image File
                  </h4>
                  <p className="text-[11px] text-[#101010]/70 mt-0.5 font-medium">
                    PNG, JPG, JPEG, or WEBP. If signature has no background, it will not be altered.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={disabled}
                  className="w-full py-2.5 px-4 bg-[#101010] hover:bg-[#252525] border border-[#101010] rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 text-white" />
                  <span>Browse</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-800 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

