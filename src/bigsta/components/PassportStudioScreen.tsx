// @ts-nocheck
import React, { useState } from "react";
import { PassportTool } from "./tools/PassportTool";
import { MergePdfTool } from "./tools/MergePdfTool";
import { useTemplateStore } from "../store/useTemplateStore";
import { UniversalBackButton } from "./common/UniversalBackButton";

export const PassportStudioScreen: React.FC = () => {
  const { setActiveScreen } = useTemplateStore();
  const [activeTab, setActiveTab] = useState<"passport" | "pdf">("passport");

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#14171A] pb-16 text-[#111827] dark:text-[#F3F4F6] transition-colors duration-200">
      <div className="bg-white dark:bg-[#1E2328] border-b border-slate-200 dark:border-white/10 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UniversalBackButton />
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Passport Size Photo & PDF Studio
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage passport photos and PDF document tools
              </p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 dark:bg-[#14171A] p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("passport")}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                activeTab === "passport" 
                  ? "bg-white dark:bg-[#1E2328] shadow-sm text-slate-900 dark:text-white" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Passport Tool
            </button>
            <button
              onClick={() => setActiveTab("pdf")}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                activeTab === "pdf" 
                  ? "bg-white dark:bg-[#1E2328] shadow-sm text-slate-900 dark:text-white" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Merge PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6">
        {activeTab === "passport" ? (
          <PassportTool onBack={() => setActiveScreen("home")} />
        ) : (
          <MergePdfTool />
        )}
      </div>
    </div>
  );
};
