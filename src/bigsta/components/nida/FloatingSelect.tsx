import React, { useState } from 'react';
import { LucideIcon, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface FloatingSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  icon?: LucideIcon;
  error?: string | null;
  helperText?: string;
}

export const FloatingSelect: React.FC<FloatingSelectProps> = ({
  label,
  options,
  icon: Icon,
  error,
  helperText,
  value,
  id,
  className = '',
  disabled,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const selectId = id || `floating-select-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const hasValue = value !== undefined && value !== null && value.toString().length > 0;
  const isFloating = isFocused || hasValue;

  const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const borderColorClass = error
    ? 'border-rose-500 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20'
    : 'border-[#C8C2BE] hover:border-[#101010] focus-within:border-[#101010] focus-within:ring-2 focus-within:ring-[#101010]/10';

  const labelColorClass = error
    ? 'text-rose-600'
    : isFocused
    ? 'text-[#101010]'
    : 'text-[#101010]/60';

  return (
    <div className="w-full space-y-1.5 font-sans">
      <div
        className={`relative flex items-center bg-[#FFFFFF] border rounded-xl transition-all duration-200 ${borderColorClass} ${
          disabled ? 'opacity-50 cursor-not-allowed bg-[#E7E2DE]' : ''
        }`}
      >
        {/* Leading Icon */}
        {Icon && (
          <div className="pl-3.5 pr-1 flex items-center pointer-events-none text-[#101010]/60">
            <Icon
              className={`w-4 h-4 transition-colors duration-200 ${
                isFocused ? 'text-[#101010]' : error ? 'text-rose-600' : 'text-[#101010]/50'
              }`}
            />
          </div>
        )}

        {/* Select container with floating label */}
        <div className="relative flex-1 py-1 px-3.5">
          <label
            htmlFor={selectId}
            className={`absolute left-3.5 transition-all duration-200 pointer-events-none select-none font-medium tracking-wide ${
              isFloating
                ? `top-1.5 text-[10px] uppercase font-bold ${labelColorClass}`
                : 'top-3.5 text-sm text-[#101010]/60'
            }`}
          >
            {label}
          </label>

          <select
            id={selectId}
            value={value}
            disabled={disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={`w-full bg-transparent text-[#101010] text-sm pt-4 pb-1 outline-none font-semibold appearance-none cursor-pointer tracking-wide ${className}`}
            {...props}
          >
            <option value="" disabled className="bg-[#FFFFFF] text-[#101010]/60">
              Select {label}
            </option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#FFFFFF] text-[#101010] py-1 font-medium">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Dropdown Chevron */}
        <div className="pr-3.5 pointer-events-none flex items-center text-[#101010]/60">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {/* Messages */}
      {(error || (helperText && !hasValue)) && (
        <div className="px-1 text-xs">
          {error ? (
            <p className="text-rose-600 font-semibold text-[11px] flex items-center gap-1">
              <span>•</span> {error}
            </p>
          ) : (
            <p className="text-[#101010]/70 font-medium text-[11px]">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
};
