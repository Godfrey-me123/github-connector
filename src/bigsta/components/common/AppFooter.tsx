import React from 'react';

export const AppFooter: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <footer
      id="app-global-footer"
      className={`w-full py-4 text-center border-t border-[#E7E2DE] mt-auto select-none pointer-events-auto bg-[#D8D2CE] ${className}`}
    >
      <p className="text-[11px] text-[#101010]/70 tracking-wider font-semibold">
        © 2026 BIGsta. All Rights Reserved.
      </p>
    </footer>
  );
};
