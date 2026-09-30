import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string | null;
  warning?: string | null;
  success?: boolean;
  successMessage?: string | null;
  helperText?: string;
  badge?: React.ReactNode;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  icon: Icon,
  error,
  warning,
  success,
  successMessage,
  helperText,
  badge,
  value,
  id,
  className = '',
  disabled,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = id || `floating-input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const displayValue = (typeof value === 'object' && value !== null)
    ? ('target' in (value as any) ? (value as any).target.value : (value as any).value || '')
    : (value ?? '');

  const hasValue = displayValue !== undefined && displayValue !== null && String(displayValue).length > 0;
  const isFloating = isFocused || hasValue;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  // Determine border and highlight state
  let borderColorClass = 'border-[#C8C2BE] hover:border-[#101010]';
  let labelColorClass = 'text-[#101010]/60';
  let focusRingClass = 'focus-within:border-[#101010] focus-within:ring-2 focus-within:ring-[#101010]/10';

  if (error) {
    borderColorClass = 'border-rose-500';
    labelColorClass = 'text-rose-600';
    focusRingClass = 'focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20';
  } else if (warning) {
    borderColorClass = 'border-amber-600';
    labelColorClass = 'text-amber-700';
    focusRingClass = 'focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-600/20';
  } else if (success) {
    borderColorClass = 'border-emerald-600';
    labelColorClass = 'text-emerald-700';
    focusRingClass = 'focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20';
  } else if (isFocused) {
    labelColorClass = 'text-[#101010]';
  }

  return (
    <div className="w-full space-y-1.5 font-sans">
      <div
        className={`relative flex items-center bg-[#FFFFFF] border rounded-xl transition-all duration-200 ${borderColorClass} ${focusRingClass} ${
          disabled ? 'opacity-50 cursor-not-allowed bg-[#E7E2DE]' : ''
        }`}
      >
        {/* Leading Icon */}
        {Icon && (
          <div className="pl-3.5 pr-1 flex items-center pointer-events-none text-[#101010]/60">
            <Icon
              className={`w-4 h-4 transition-colors duration-200 ${
                isFocused ? 'text-[#101010]' : error ? 'text-rose-600' : warning ? 'text-amber-700' : 'text-[#101010]/50'
              }`}
            />
          </div>
        )}

        {/* Input container with floating label */}
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
            id={inputId}
            value={displayValue}
            disabled={disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={hasValue ? '' : props.placeholder}
            className={`w-full bg-transparent text-[#101010] text-sm pt-4 pb-1 outline-none font-semibold placeholder-[#101010]/40 tracking-wide ${className}`}
            {...props}
          />
        </div>

        {/* Optional trailing badge or status */}
        {badge && <div className="pr-3.5 flex items-center">{badge}</div>}
      </div>

      {/* Validation or helper message rendered OUTSIDE the input field */}
      {error ? (
        <div className="flex items-center justify-between px-1 text-xs">
          <p className="text-rose-600 font-semibold text-[11px] flex items-center gap-1">
            <span className="font-bold">•</span> {error}
          </p>
        </div>
      ) : warning ? (
        <div className="flex items-center justify-between px-1 text-xs">
          <p className="text-amber-700 font-semibold text-[11px] flex items-center gap-1">
            <span className="font-bold">•</span> {warning}
          </p>
        </div>
      ) : success && successMessage ? (
        <div className="flex items-center justify-between px-1 text-xs">
          <p className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
            <span className="font-bold">•</span> {successMessage}
          </p>
        </div>
      ) : helperText && !hasValue ? (
        <p className="px-1 text-[11px] text-[#101010]/70 font-medium">{helperText}</p>
      ) : null}
    </div>
  );
};
