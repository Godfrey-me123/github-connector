import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';

interface UniversalBackButtonProps {
  className?: string;
  label?: string;
  onClickCustom?: () => void;
}

export const UniversalBackButton: React.FC<UniversalBackButtonProps> = ({
  className = '',
  label = 'Back',
  onClickCustom,
}) => {
  const { goBack } = useTemplateStore();

  const handleClick = () => {
    if (onClickCustom) {
      onClickCustom();
    } else {
      goBack();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-inherit hover:opacity-75 transition-colors cursor-pointer shrink-0 active:scale-95 ${className}`}
      title="Return to previous screen"
      aria-label="Return to previous screen"
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
};
