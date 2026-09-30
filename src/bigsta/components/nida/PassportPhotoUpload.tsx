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

export const PassportPhotoUpload: React.FC<PassportPhotoUploadProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate and read file while strictly preserving original format & transparency
  const processFile = (file: File) => {
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

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        setError('Failed to read image file.');
        setIsProcessing(false);
        return;
      }

      // Preserve original file, format, MIME type, and transparency untouched!
      setIsProcessing(false);
      setRawImageForCrop(dataUrl);
      onChange(dataUrl);
    };

    reader.onerror = () => {
      setError('Error reading file. Please try again.');
      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // reset input so same file can be chosen again
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
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {/* Main Upload Card Container */}
      <div className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl space-y-4 shadow-xs">
        {/* Card Header */}
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
            <span className="px-2 py-0.5 rounded-md bg-[#E7E2DE] border border-[#C8C2BE] text-[#FF6839]">
              Max 10MB
            </span>
          </div>
        </div>

        {/* Content Area: Either Upload State or Photo Preview State */}
        {!value ? (
          <div className="space-y-3">
            {/* Large Upload Drop Zone / Button */}
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
                Upload Passport Photo from Files
              </h3>
              <p className="text-xs text-[#101010]/70 mt-1 max-w-xs font-medium">
                Supports JPG, JPEG, PNG (including transparent backgrounds), or WEBP up to 10MB.
              </p>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-4 px-4 py-2 bg-[#101010] hover:bg-[#252525] text-white text-xs font-bold rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-white" />
                <span>Choose</span>
              </button>
            </div>
          </div>
        ) : (
          /* Preview State with Passport Ratio & Action Buttons */
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 p-3 sm:p-4 bg-[#E7E2DE] border border-[#C8C2BE] rounded-2xl">
            {/* Passport Frame Preview (Exact 35:45 ratio with transparency checkerboard background) */}
            <div
              className="relative w-[130px] sm:w-[140px] h-[167px] sm:h-[180px] rounded-xl overflow-hidden border-2 border-[#101010] shadow-md shrink-0 group"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #d8d2ce 25%, transparent 25%), linear-gradient(-45deg, #d8d2ce 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d8d2ce 75%), linear-gradient(-45deg, transparent 75%, #d8d2ce 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                backgroundColor: '#ffffff',
              }}
            >
              <img
                src={value}
                alt="Passport Photo Preview"
                className="w-full h-full object-contain"
              />

              {/* Verified Badge */}
              <div className="absolute top-1.5 right-1.5 bg-emerald-700 text-white rounded-full p-1 shadow-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>

              {/* Passport dimension tag */}
              <div className="absolute bottom-1 left-1 right-1 bg-black/75 backdrop-blur-xs rounded px-1.5 py-0.5 text-center text-[9px] font-mono text-white font-bold">
                Original Asset Preserved
              </div>
            </div>

            {/* Photo Details & Action Controls */}
            <div className="flex-1 space-y-3 w-full text-center sm:text-left">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                    Photo Attached
                  </span>
                  <span className="text-[10px] text-[#101010]/70 font-semibold">
                    Ready for Identity Card
                  </span>
                </div>
                <p className="text-xs text-[#101010]/70 mt-1 leading-relaxed font-medium">
                  Original image properties and transparency are preserved intact. You can adjust crop, replace, or remove as needed.
                </p>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
                {/* Crop Photo */}
                <button
                  type="button"
                  onClick={handleOpenCrop}
                  className="py-2 px-1.5 sm:px-2.5 bg-[#FFFFFF] hover:bg-[#F5F2EF] border border-[#C8C2BE] hover:border-[#101010] rounded-xl text-[11px] sm:text-xs font-bold text-[#101010] flex items-center justify-center gap-1 sm:gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                  title="Crop Photo"
                >
                  <Crop className="w-3.5 h-3.5 text-[#101010] shrink-0" />
                  <span className="truncate">Crop</span>
                </button>

                {/* Replace Photo */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2 px-1.5 sm:px-2.5 bg-[#FFFFFF] hover:bg-[#F5F2EF] border border-[#C8C2BE] hover:border-[#101010] rounded-xl text-[11px] sm:text-xs font-bold text-[#101010] flex items-center justify-center gap-1 sm:gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                  title="Replace with new photo"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#101010] shrink-0" />
                  <span className="truncate">Replace</span>
                </button>

                {/* Remove Photo */}
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="py-2 px-1.5 sm:px-2.5 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-xl text-[11px] sm:text-xs font-bold text-rose-800 flex items-center justify-center gap-1 sm:gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Remove Photo"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Remove</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Friendly Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-800 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Interactive Passport Crop Modal */}
      {showCropModal && (rawImageForCrop || value) && (
        <PhotoCropModal
          imageSrc={rawImageForCrop || (value as string)}
          onCropComplete={handleCropComplete}
          onCancel={() => setShowCropModal(false)}
        />
      )}
    </div>
  );
};
