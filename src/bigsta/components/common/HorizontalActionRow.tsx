import React from 'react';

interface HorizontalActionRowProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * Isolated horizontal scroll container for button/action rows.
 * Allows smooth touch/swipe navigation on small screens when content overflows,
 * while preventing the entire page from having horizontal scrollbars.
 */
export const HorizontalActionRow: React.FC<HorizontalActionRowProps> = ({
  children,
  className = '',
  id,
}) => {
  return (
    <div
      id={id}
      className={`w-full max-w-full overflow-x-auto overflow-y-hidden touch-pan-x scroll-smooth no-scrollbar flex items-center justify-start sm:justify-end flex-nowrap shrink-0 gap-1.5 ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorX: 'contain',
      }}
    >
      <div className="flex items-center gap-1.5 flex-nowrap shrink-0 ml-auto">
        {children}
      </div>
    </div>
  );
};
