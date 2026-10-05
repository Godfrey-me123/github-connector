// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import React, { useState, useRef } from 'react';
import {
  Upload,
  Crop,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { PhotoCropModal } from './PhotoCropModal';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface PassportPhotoUploadProps {
  value?: string | null;
  onChange: (photoDataUrl: string | null) => void;
  disabled?: boolean;
}

// Alpha channel matting / morphological smoothing to clean up white fringe artifacts on facial edges
async function applyAlphaMatting(blob: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }
      ctx.drawImage(img, 0, 0);
      
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Target semi-transparent or bright edge pixels (white fringe)
        if (a > 0 && a < 252 && r > 200 && g > 200 && b > 200) {
          data[i + 3] = Math.max(0, a - 70);
        } else if (a === 255 && r > 245 && g > 245 && b > 245) {
          data[i + 3] = 238;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      canvas.toBlob((b) => {
        resolve(b || blob);
      }, 'image/png', 1.0);
    };
    img.onerror = () => resolve(blob);
    img.src = url;
  });
}

export const PassportPhotoUpload: React.FC<PassportPhotoUploadProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [autoRemoveBg, setAutoRemoveBg] = useState<boolean>(true);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate and read file with optional auto background removal and alpha matting
  const processFile = async (file: File) => {
    setError(null);

    // Format validation
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setError('Unsupported file format. Please upload JPG, JPEG, PNG, or WEBP.');
      return;
    }

    // Size validation (Max 10MB)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`File is too large (${sizeMb}MB). Maximum allowed size is 10MB.`);
      return;
    }

    setIsProcessing(true);

    let workingFile = file;

    if (autoRemoveBg) {
      try {
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch('/api/remove-bg', { method: 'POST', body: formData });
        if (res.ok) {
          const blob = await res.blob();
          const mattedBlob = await applyAlphaMatting(blob);
          workingFile = new File([mattedBlob], 'nobg.png', { type: 'image/png' });
        }
      } catch (err) {
        console.warn('Auto background removal fallback:', err);
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        setError('Failed to read image file.');
        setIsProcessing(false);
        return;
      }

      setIsProcessing(false);
      setRawImageForCrop(dataUrl);
      onChange(dataUrl);
    };

    reader.onerror = () => {
      setError('Error reading file. Please try again.');
      setIsProcessing(false);
    };

    reader.readAsDataURL(workingFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenCrop = () => {
    if (rawImageForCrop || value) {
      setShowCropModal(true);
    }
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setShowCropModal(false);
    onChange(croppedDataUrl);
  };

  const handleRemovePhoto = () => {
    onChange(null);
    setRawImageForCrop(null);
    setError(null);
  };

  return (
    <div className="w-full space-y-3 font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled}
      />

      <div className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#101010]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
              Passport Photo Specification
            </h2>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#101010]/80 font-bold">
            <span className="px-2 py-0.5 rounded-md bg-[#E7E2DE] border border-[#C8C2BE]">
              35 × 45 mm (3:4)
            </span>
          </div>
        </div>

        {/* Background Removal Checkbox Option */}
        <div className="flex items-center justify-between bg-[#E7E2DE]/50 p-3 rounded-xl border border-[#C8C2BE]">
          <span className="text-xs font-bold text-[#101010]">Auto Background Removal</span>
          <input
            type="checkbox"
            checked={autoRemoveBg}
            onChange={(e) => setAutoRemoveBg(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        {!value ? (
          <div className="space-y-3">
            <div
              onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed border-[#C8C2BE] hover:border-[#101010] hover:bg-[#E7E2DE]/50 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group ${
                disabled || isProcessing ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#E7E2DE] border border-[#C8C2BE] group-hover:border-[#101010] flex items-center justify-center mb-3 shadow-xs transition-all">
                {isProcessing ? (
                  <RefreshCw className="w-6 h-6 text-[#101010] animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-[#101010] group-hover:scale-110 transition-transform" />
                )}
              </div>

              <h3 className="text-sm font-bold text-[#101010]">
                {isProcessing ? 'Removing Background & Matting...' : 'Upload Passport Photo'}
              </h3>
              <p className="text-xs text-[#101010]/70 mt-1 max-w-xs font-medium">
                Supports JPG, JPEG, PNG, or WEBP up to 10MB.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-3 bg-[#E7E2DE]/30 rounded-xl border border-[#C8C2BE]">
            <div className="w-16 h-20 bg-white rounded-lg border border-[#C8C2BE] overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
              <img src={value} alt="Passport Preview" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" /> Photo Uploaded
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenCrop}
                  className="px-3 py-1 bg-white hover:bg-[#E7E2DE] text-[#101010] border border-[#C8C2BE] rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Crop className="w-3.5 h-3.5" /> Crop
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {showCropModal && value && (
        <PhotoCropModal
          imageUrl={value}
          onCropComplete={handleCropComplete}
          onClose={() => setShowCropModal(false)}
        />
      )}
    </div>
  );
};
