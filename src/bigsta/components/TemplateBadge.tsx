import React from 'react';
import { CardType, CardSide } from '../types';

interface TemplateBadgeProps {
  cardType?: CardType;
  side?: CardSide;
  size?: 'sm' | 'md';
}

export const TemplateBadge: React.FC<TemplateBadgeProps> = ({
  cardType = 'National ID',
  side = 'Front Side',
  size = 'md',
}) => {
  const getTypeColor = (type: CardType) => {
    switch (type) {
      case 'National ID':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Employee ID':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Student ID':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Membership Card':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
      case 'Access Badge':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getSideColor = (s: CardSide) => {
    switch (s) {
      case 'Front Side':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'Back Side':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'Full Card':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    }
  };

  const textPadding = size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {cardType && (
        <span
          className={`font-semibold rounded border uppercase tracking-wider ${textPadding} ${getTypeColor(
            cardType
          )}`}
        >
          {cardType}
        </span>
      )}
      {side && (
        <span
          className={`font-semibold rounded border uppercase tracking-wider ${textPadding} ${getSideColor(
            side
          )}`}
        >
          {side}
        </span>
      )}
    </div>
  );
};
