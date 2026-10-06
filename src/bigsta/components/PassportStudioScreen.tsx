// @ts-nocheck
import React from "react";
import { PassportTool } from "./tools/PassportTool";
import { useTemplateStore } from "../store/useTemplateStore";
import { UniversalBackButton } from "./common/UniversalBackButton";

export const PassportStudioScreen: React.FC = () => {
  const { setActiveScreen } = useTemplateStore();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#14171A] pb-16 text-[#111827] dark:text-[#F3F4F6] transition-colors duration-200">
      <div className="bg-white dark:bg-[#1E2328] border-b border-slate-200 dark:border-white/10 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UniversalBackButton />
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Passport Size Photo Studio
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Crop, resize and format official passport and visa size photos
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6">
        <PassportTool onBack={() => setActiveScreen("home")} />
      </div>
    </div>
  );
};
