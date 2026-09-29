import React, { useState, useRef } from 'react';
import { Calendar } from 'lucide-react';
import {
  convertIsoToDdMmmYyyy,
  convertIsoToDdMmYyyy,
  formatToDdMmYyyy,
  convertAnyDateToIso,
  normalizeDateInput,
  validateDdMmmYyyy,
} from '../../utils/dateValidation';

interface FloatingDatePickerProps {
  label: string;
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  error?: string | null;
  helperText?: string;
  suggestedDate?: string;
  onApplySuggestedDate?: (date: string) => void;
  id?: string;
  disabled?: boolean;
  noManualTyping?: boolean;
  dateFormat?: 'DD/MM/YYYY' | 'DD MMM YYYY';
}

export const FloatingDatePicker: React.FC<FloatingDatePickerProps> = ({
  label,
  value = '',
  onChange,
  error,
  helperText,
  suggestedDate,
  onApplySuggestedDate,
  id,
  disabled = false,
  noManualTyping = false,
  dateFormat = 'DD MMM YYYY',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);
  const inputId = id || `floating-date-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const hasValue = value.length > 0;
  const isFloating = isFocused || hasValue;

  const triggerPicker = () => {
    if (disabled) return;
    try {
      hiddenDateInputRef.current?.showPicker?.();
    } catch (e) {
      hiddenDateInputRef.current?.focus();
      hiddenDateInputRef.current?.click();
    }
  };

  // Handle manual typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (noManualTyping) return;
    const raw = e.target.value.toUpperCase();
    onChange?.({ target: { value: raw } });
  };

  // When blurred, normalize if valid
  const handleBlur = () => {
    setIsFocused(false);
    if (value && !noManualTyping) {
      const normalized = dateFormat === 'DD/MM/YYYY' ? formatToDdMmYyyy(value) : normalizeDateInput(value);
      if (normalized !== value) {
        onChange?.({ target: { value: normalized } });
      }
    }
  };

  // Handle native calendar picker selection
  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value; // YYYY-MM-DD
    if (isoVal) {
      const formatted = dateFormat === 'DD/MM/YYYY' ? convertIsoToDdMmYyyy(isoVal) : convertIsoToDdMmmYyyy(isoVal);
      if (formatted) {
        onChange?.({ target: { value: formatted } });
      }
    }
  };

  const borderColorClass = error
    ? 'border-rose-500 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20'
    : 'border-[#C8C2BE] hover:border-[#101010] focus-within:border-[#101010] focus-within:ring-2 focus-within:ring-[#101010]/10';

  const labelColorClass = error
    ? 'text-rose-600'
    : isFocused
    ? 'text-[#101010]'
    : 'text-[#101010]/60';

  const showSuggestion = suggestedDate && suggestedDate !== value;

  return (
    <div className="w-full space-y-1.5 font-sans">
      <div
        onClick={noManualTyping && !disabled ? triggerPicker : undefined}
        className={`relative flex items-center bg-[#FFFFFF] border rounded-xl transition-all duration-200 ${borderColorClass} ${
          disabled ? 'opacity-50 cursor-not-allowed bg-[#E7E2DE]' : ''
        } ${noManualTyping && !disabled ? 'cursor-pointer select-none' : ''}`}
      >
        {/* Leading Icon & Calendar trigger button */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            triggerPicker();
          }}
          className="pl-3.5 pr-1 flex items-center text-[#101010]/60 hover:text-[#101010] transition-colors cursor-pointer"
          title="Pick date from calendar"
        >
          <Calendar
            className={`w-4 h-4 transition-colors duration-200 ${
              isFocused ? 'text-[#101010]' : error ? 'text-rose-600' : 'text-[#101010]/50'
            }`}
          />
        </button>

        {/* Hidden HTML5 date picker input */}
        <input
          ref={hiddenDateInputRef}
          type="date"
          tabIndex={-1}
          className="sr-only"
          value={convertAnyDateToIso(value)}
          onChange={handleNativePickerChange}
        />

        {/* Date text input with floating label */}
        <div className="relative flex-1 py-1 px-3.5">
          <label
            htmlFor={inputId}
            className={`absolute left-3.5 transition-all duration-200 pointer-events-none select-none font-medium tracking-wide ${
              isFloating
                ? `top-1.5 text-[10px] uppercase font-bold ${labelColorClass}`
                : 'top-3.5 text-sm text-[#101010]/60'
            }`}
          >
            {label}
          </label>

          <input
            type="text"
            id={inputId}
            value={value}
            disabled={disabled}
            readOnly={noManualTyping}
            onFocus={(e) => {
              if (noManualTyping) {
                e.target.blur();
                triggerPicker();
              } else {
                setIsFocused(true);
              }
            }}
            onBlur={handleBlur}
            onChange={handleInputChange}
            onClick={(e) => {
              if (noManualTyping) {
                e.stopPropagation();
                triggerPicker();
              }
            }}
            placeholder={!isFloating ? '' : undefined}
            maxLength={dateFormat === 'DD/MM/YYYY' ? 10 : 11}
            autoComplete="off"
            spellCheck={false}
            className={`w-full bg-transparent text-[#101010] text-sm pt-4 pb-1 outline-none font-semibold tracking-wider ${
              noManualTyping && !disabled ? 'cursor-pointer select-none' : ''
            }`}
          />
        </div>

        {/* Quick sync with NIDA extracted date */}
        {showSuggestion && onApplySuggestedDate && (
          <div className="pr-3 flex items-center">
            <button
              type="button"
              onClick={() => onApplySuggestedDate(suggestedDate)}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-[#B5A5FF] text-[#101010] border border-[#101010]/20 hover:bg-[#a08fff] transition-colors cursor-pointer"
              title={`Sync NIDA date: ${suggestedDate}`}
            >
              <span>Use {suggestedDate}</span>
            </button>
          </div>
        )}
      </div>

      {/* Error-only validation message */}
      {error && (
        <div className="px-1 text-xs">
          <p className="text-rose-600 font-semibold text-[11px] flex items-center gap-1">
            <span>•</span> {error}
          </p>
        </div>
      )}
    </div>
  );
};
