// @ts-nocheck -- imported legacy BIGsta code
import React from 'react';
import { ShieldCheck, User } from 'lucide-react';
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
  userProfile,
  onOpenAccountModal,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 text-slate-800 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTool('home')}
            className="flex items-center gap-2 text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              IE
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              Editor
            </span>
          </button>
        </div>

        {/* Account Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAccountModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
          >
            <User className="w-4 h-4 text-blue-600" />
            <span>{userProfile.name}</span>
            <span className="bg-blue-500/20 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
              {userProfile.plan}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
