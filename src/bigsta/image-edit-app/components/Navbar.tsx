// @ts-nocheck -- imported legacy BIGsta code
import React from 'react';
import { ToolId, UserProfile } from '../types/imageTools';

interface NavbarProps {
  activeTool: ToolId | 'home';
  onSelectTool: (tool: ToolId | 'home') => void;
  userProfile: UserProfile;
  onOpenAccountModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTool,
  onSelectTool,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 text-slate-800 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTool('home')}
            className="flex items-center gap-2 text-left focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              IE
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              Editor
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
