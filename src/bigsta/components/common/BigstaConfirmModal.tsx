let pendingDialogQueue: Array<{ options: BigstaConfirmOptions; resolve: (value: boolean) => void }> = [];
import React, { useEffect, useState } from "react";
import { Shield, AlertTriangle, Info, X } from "lucide-react";

export interface BigstaConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  type?: "confirm" | "alert";
}

interface DialogState extends BigstaConfirmOptions {
  isOpen: boolean;
  resolve: (value: boolean) => void;
}

let openDialogHandler: ((options: BigstaConfirmOptions, resolve: (value: boolean) => void) => void) | null = null;

/**
 * Universal in-app confirmation modal for BIGsta.
 * Replaces native browser `window.confirm()` and `window.alert()` to eliminate
 * the mobile WebView/browser URL header (e.g. 'The page at "https://bigsta.vercel.app" says:').
 */
export function bigstaConfirm(options: BigstaConfirmOptions | string): Promise<boolean> {
  const opts: BigstaConfirmOptions =
    typeof options === "string" ? { message: options, title: "BIGsta" } : { title: "BIGsta", ...options };

  if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") {
    return Promise.resolve(true);
  }

  if (openDialogHandler) {
    return new Promise<boolean>((resolve) => {
      openDialogHandler!(opts, resolve);
    });
  }

  return new Promise<boolean>((resolve) => {
    pendingDialogQueue.push({ options: opts, resolve });
    // Safety fallback: if dialog handler is not mounted, resolve gracefully without native browser pop-up
    setTimeout(() => {
      const idx = pendingDialogQueue.findIndex((item) => item.options === opts);
      if (idx !== -1) {
        pendingDialogQueue.splice(idx, 1);
        resolve(true);
      }
    }, 350);
  });
}

export function bigstaAlert(options: BigstaConfirmOptions | string): Promise<void> {
  const opts: BigstaConfirmOptions =
    typeof options === "string"
      ? { message: options, title: "BIGsta", type: "alert", confirmLabel: "OK" }
      : { title: "BIGsta", type: "alert", confirmLabel: "OK", ...options };

  return bigstaConfirm(opts).then(() => {});
}

export const BigstaConfirmModal: React.FC = () => {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    openDialogHandler = (options, resolve) => {
      setDialog({
        ...options,
        title: options.title || "BIGsta",
        confirmLabel: options.confirmLabel || "OK",
        cancelLabel: options.cancelLabel || "Cancel",
        isOpen: true,
        resolve,
      });
    };

    if (pendingDialogQueue.length > 0) {
      const next = pendingDialogQueue.shift();
      if (next) {
        openDialogHandler(next.options, next.resolve);
      }
    }

    return () => {
      openDialogHandler = null;
    };
  }, []);

  useEffect(() => {
    if (!dialog?.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialog]);

  if (!dialog?.isOpen) return null;

  const handleConfirm = () => {
    const resolve = dialog.resolve;
    setDialog(null);
    resolve(true);
    if (pendingDialogQueue.length > 0 && openDialogHandler) {
      const next = pendingDialogQueue.shift();
      if (next) setTimeout(() => openDialogHandler!(next.options, next.resolve), 50);
    }
  };

  const handleCancel = () => {
    const resolve = dialog.resolve;
    setDialog(null);
    resolve(false);
    if (pendingDialogQueue.length > 0 && openDialogHandler) {
      const next = pendingDialogQueue.shift();
      if (next) setTimeout(() => openDialogHandler!(next.options, next.resolve), 50);
    }
  };

  const isAlert = dialog.type === "alert";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-md bg-[#16181D] text-white rounded-2xl border border-[#2C3038] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with BIGsta branding */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2C3038] bg-[#101216]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                dialog.isDestructive
                  ? "bg-red-500/20 text-red-400"
                  : "bg-amber-400/20 text-amber-300"
              }`}
            >
              {dialog.isDestructive ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
            </div>
            <span className="font-bold text-sm tracking-wide text-white font-sans uppercase">
              {dialog.title || "BIGsta"}
            </span>
          </div>

          {!isAlert && (
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Message body */}
        <div className="p-5 text-sm text-gray-200 leading-relaxed font-sans whitespace-pre-wrap break-words">
          {dialog.message}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-[#101216] border-t border-[#2C3038]">
          {!isAlert && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {dialog.cancelLabel || "Cancel"}
            </button>
          )}

          <button
            type="button"
            autoFocus
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer ${
              dialog.isDestructive
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-amber-400 hover:bg-amber-300 text-[#101216]"
            }`}
          >
            {dialog.confirmLabel || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
};
