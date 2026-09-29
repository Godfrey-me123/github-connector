import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Move, Sparkles } from 'lucide-react';

interface PhotoCropModalProps {
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

// Passport photo aspect ratio: 35mm x 45mm (approx 7:9 ratio, width 350px, height 450px)
const TARGET_ASPECT = 35 / 45; // ~0.7777
const OUTPUT_WIDTH = 700;
const OUTPUT_HEIGHT = 900;

export const PhotoCropModal: React.FC<PhotoCropModalProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset positioning on mount or imageSrc change
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, [imageSrc]);

  // Touch & Mouse drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Perform crop calculation and produce high-resolution passport photo
  const handleApplyCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Preserve transparency if PNG; do not fill with white
    const isPng = imageSrc.startsWith('data:image/png');
    const isWebp = imageSrc.startsWith('data:image/webp');

    if (isPng) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Calculate transformation
    ctx.save();
    // Center point of canvas
    ctx.translate(canvas.width / 2, canvas.height / 2);
    // Apply user rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate mapping between container coordinates and output canvas
    const scaleFactor = OUTPUT_WIDTH / containerRect.width;

    const userOffsetCanvasX = position.x * scaleFactor;
    const userOffsetCanvasY = position.y * scaleFactor;

    ctx.translate(userOffsetCanvasX, userOffsetCanvasY);
    ctx.scale(scale, scale);

    // Draw image centered
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawW: number;
    let drawH: number;

    // Base fit: cover the target canvas
    if (imgAspect > TARGET_ASPECT) {
      drawH = OUTPUT_HEIGHT;
      drawW = drawH * imgAspect;
    } else {
      drawW = OUTPUT_WIDTH;
      drawH = drawW / imgAspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const outputMime = isPng ? 'image/png' : isWebp ? 'image/webp' : 'image/jpeg';
    const resultDataUrl = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL(outputMime, 0.95);
    onCropComplete(resultDataUrl);
  };

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#0E1013] border border-[#4C5055] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#4C5055]/50 bg-[#14171C]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#47A5FF] shadow-[0_0_8px_#47A5FF]" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Passport Photo Crop (35 × 45 mm)
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#A0A4A8] hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Workspace */}
        <div className="relative flex-1 bg-black flex flex-col items-center justify-center p-4 overflow-hidden select-none">
          {/* Passport Mask Box (35:45 ratio) */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-[245px] h-[315px] sm:w-[280px] sm:h-[360px] rounded-xl overflow-hidden border-2 border-[#47A5FF] shadow-[0_0_25px_rgba(71,165,255,0.25)] cursor-grab active:cursor-grabbing bg-slate-950 flex items-center justify-center"
            style={{ touchAction: 'none' }}
          >
            {/* The Image being cropped */}
            <div
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
              className="w-full h-full flex items-center justify-center pointer-events-none"
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className="max-w-none w-full h-full object-cover select-none"
                draggable={false}
              />
            </div>

            {/* Passport Guidelines Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Head / Face Oval Guide */}
              <div className="absolute top-[12%] left-[18%] right-[18%] bottom-[22%] border border-dashed border-[#47A5FF]/60 rounded-[50%_50%_45%_45%] shadow-[0_0_10px_rgba(71,165,255,0.2)]" />

              {/* Eye level line */}
              <div className="absolute top-[42%] left-[10%] right-[10%] border-b border-[#FF8F00]/50" />
              <span className="absolute top-[43%] right-2 text-[9px] font-mono text-[#FF8F00] bg-black/60 px-1 rounded">
                Eye Level
              </span>

              {/* Chin line */}
              <div className="absolute bottom-[22%] left-[25%] right-[25%] border-b border-dashed border-[#47A5FF]/40" />

              {/* Hint badge */}
              <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-slate-300 flex items-center gap-1">
                <Move className="w-3 h-3 text-[#47A5FF]" />
                <span>Drag to reposition</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="px-5 py-4 bg-[#14171C] border-t border-[#4C5055]/50 space-y-4">
          {/* Zoom & Rotation Sliders */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-[#A0A4A8]" />
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-[#47A5FF] h-1.5 bg-[#4C5055]/50 rounded-lg cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-[#A0A4A8]" />
            <span className="text-xs font-mono text-[#FFFFFF] w-12 text-right">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="ml-2 p-2 rounded-lg bg-[#1C1F22] hover:bg-[#4C5055]/40 border border-[#4C5055] text-white transition-colors"
              title="Rotate 90 degrees"
            >
              <RotateCw className="w-4 h-4 text-[#47A5FF]" />
            </button>
          </div>

          {/* Quick Fit & Alignment Buttons */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
                setRotation(0);
              }}
              className="text-xs text-[#A0A4A8] hover:text-white px-2.5 py-1.5 rounded-lg border border-[#4C5055]/40 bg-black/40 hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-[#FF8F00]" />
              <span>Reset Fit</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl border border-transparent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#47A5FF] to-[#2563eb] rounded-xl shadow-[0_4px_15px_rgba(71,165,255,0.35)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Crop</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
