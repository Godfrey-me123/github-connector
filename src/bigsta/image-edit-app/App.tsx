// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import React, { useState, useEffect } from "react";
import { ToolId, UserProfile } from "./types/imageTools";
import { Navbar } from "./components/Navbar";
import { PrivacyBanner } from "./components/PrivacyBanner";
import { ToolGrid } from "./components/ToolGrid";
import { RemoveBgTool } from "./components/tools/RemoveBgTool";
import { ResizeTool } from "./components/tools/ResizeTool";
import { CompressTool } from "./components/tools/CompressTool";
import { CropTool } from "./components/tools/CropTool";
import { RotateTool } from "./components/tools/RotateTool";
import { ConvertTool } from "./components/tools/ConvertTool";
import { WatermarkTool } from "./components/tools/WatermarkTool";
import { OcrTool } from "./components/tools/OcrTool";
import { EnhanceTool } from "./components/tools/EnhanceTool";
import { RenameTool } from "./components/tools/RenameTool";
import { PassportTool } from "./components/tools/PassportTool";
import { MergePdfTool } from "./components/tools/MergePdfTool";
import { AccountModal } from "./components/AccountModal";
import { ShieldCheck, Lock } from "lucide-react";
import { saveActiveImageStorage, loadActiveImageStorage } from "../services/activeImageStorage";

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId | "home">("home");
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [activeBatchFiles, setActiveBatchFiles] = useState<File[] | null>(null);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);

  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: "usr_892341",
    name: "Creative Pro User",
    email: "pro.user@imageedit.app",
    plan: "Pro",
    dailyUsageLimit: 500,
    dailyUsageCount: 14,
    tokensRemaining: 8450,
    settings: {
      defaultExportFormat: "PNG",
      defaultCompressionQuality: 85,
      autoDeleteAfterDownload: true,
      highDpiExport: true,
    },
  });

  useEffect(() => {
    // Load cached active image from IndexedDB/localStorage storage service
    loadActiveImageStorage().then((cached) => {
      if (cached && cached.dataUrl && !activeFile) {
        fetch(cached.dataUrl)
          .then((res) => res.blob())
          .then((blob) => {
            const cachedFile = new File([blob], cached.metadata?.name || "cached_photo.png", {
              type: "image/png",
            });
            setActiveFile(cachedFile);
          })
          .catch(() => {});
      }
    });

    // Fetch initial user profile settings from backend
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUserProfile(data.user);
        }
      })
      .catch((err) => console.log("Backend user fetch fallback:", err));
  }, []);

  const handleQuickUpload = (files: FileList) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    if (fileArray.length > 1) {
      setActiveBatchFiles(fileArray);
      setActiveTool("convert"); // Default batch action to converter
    } else {
      const file = fileArray[0];
      setActiveFile(file);
      setActiveTool("compress"); // Default single file action to compress
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          saveActiveImageStorage(e.target.result as string, {
            name: file.name,
            service: "image_edit",
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectTool = (tool: ToolId | "home") => {
    setActiveTool(tool);
    if (tool === "home") {
      setActiveFile(null);
      setActiveBatchFiles(null);
    }
  };

  const handleUpdateSettings = (newSettings: UserProfile["settings"]) => {
    setUserProfile((prev) => ({ ...prev, settings: newSettings }));
    fetch("/api/user/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Bar Navigation */}
      <Navbar
        activeTool={activeTool}
        onSelectTool={handleSelectTool}
        userProfile={userProfile}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        {activeTool === "home" && (
          <ToolGrid
            onSelectTool={(toolId) => setActiveTool(toolId)}
            onQuickUpload={handleQuickUpload}
          />
        )}

        {activeTool === "remove-bg" && (
          <RemoveBgTool
            initialFile={activeFile}
            onBack={() => handleSelectTool("home")}
            onSelectTool={handleSelectTool}
          />
        )}

        {activeTool === "resize" && (
          <ResizeTool initialFile={activeFile} onBack={() => handleSelectTool("home")} />
        )}

        {activeTool === "compress" && (
          <CompressTool initialFile={activeFile} onBack={() => handleSelectTool("home")} />
        )}

        {activeTool === "crop" && (
          <CropTool initialFile={activeFile} onBack={() => handleSelectTool("home")} />
        )}

        {activeTool === "merge-pdf" && <MergePdfTool onBack={() => handleSelectTool("home")} />}

        {activeTool === "rotate" && (
          <RotateTool initialFile={activeFile} onBack={() => handleSelectTool("home")} />
        )}

        {activeTool === "convert" && (
          <ConvertTool
            initialFiles={activeBatchFiles || (activeFile ? [activeFile] : null)}
            onBack={() => handleSelectTool("home")}
          />
        )}

        {activeTool === "watermark" && (
          <WatermarkTool initialFile={activeFile} onBack={() => handleSelectTool("home")} />
        )}

        {activeTool === "ocr" && (
          <OcrTool initialFile={activeFile} onBack={() => handleSelectTool("home")} />
        )}

        {activeTool === "enhance" && (
          <EnhanceTool initialFile={activeFile} onBack={() => handleSelectTool("home")} />
        )}

        {activeTool === "rename" && (
          <RenameTool
            initialFiles={activeBatchFiles || (activeFile ? [activeFile] : null)}
            onBack={() => handleSelectTool("home")}
          />
        )}

        {activeTool === "passport" && (
          <PassportTool initialFile={activeFile} onBack={() => handleSelectTool("home")} />
        )}
      </main>

      {/* Account & Subscription Preferences Modal Drawer */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        userProfile={userProfile}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
