// @ts-nocheck -- imported legacy BIGsta code
import React from "react";
import { ShieldCheck } from "lucide-react";

export const PrivacyBanner: React.FC = () => {
  return (
    <div className="bg-blue-50 border-b border-blue-100 text-slate-700 py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-bold">
        <span className="text-blue-800">Secure Processing</span>
        <span>Zero Storage</span>
      </div>
    </div>
  );
};
