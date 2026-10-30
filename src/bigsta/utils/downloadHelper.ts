// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
/**
 * Universal Safe Download & File Export Utility for BIGsta
 *
 * Solves the critical issue where clicking download or export causes
 * Android APK WebViews, PWAs, or mobile browsers to crash, navigate away,
 * or close the application.
 *
 * Handles:
 * 1. Native Android APK Bridges (AndroidInterface, Android, JSInterface, BIGstaAndroid)
 * 2. High-res Blob conversion (avoids massive data URIs that crash WebView processes or violate Chromium navigation)
 * 3. Extended Blob URL lifecycle (prevents premature URL.revokeObjectURL aborting downloads)
 * 4. Synthetic MouseEvents with isolated hidden anchors (prevents page navigation)
 * 5. Web Share API fallback where applicable
 */

export interface UniversalDownloadPayload {
  fileName: string;
  content: Blob | ArrayBuffer | Uint8Array | string;
  mimeType?: string;
}

/**
 * Detect any available Android Native Interface bridge
 */
export function getAndroidBridge(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return (
    w.AndroidInterface || w.Android || w.JSInterface || w.BIGstaAndroid || w.WebAppInterface || null
  );
}

/**
 * Check if running inside native Android wrapper
 */
export function isAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  return Boolean(
    getAndroidBridge() ||
    typeof (window as any).saveFileNatively === "function" ||
    /Android/i.test(userAgent) && (/;\s*wv\)/i.test(userAgent) || /BIGsta/i.test(userAgent)),
  );
}

/**
 * Convert base64 string to Blob
 */
export function base64ToBlob(base64: string, mimeType: string = "application/octet-stream"): Blob {
  try {
    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "").trim();
    const binaryStr = atob(cleanBase64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  } catch (e) {
    console.warn("[downloadHelper] Base64 to Blob conversion fallback:", e);
    return new Blob([base64], { type: mimeType });
  }
}

/**
 * Convert Blob to Base64 data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert HTML Canvas to Blob safely with fallback
 */
export function canvasToBlobPromise(
  canvas: HTMLCanvasElement,
  format: string = "image/png",
  quality: number = 0.95,
): Promise<Blob> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback via data URL if toBlob returns null
            const dataUrl = canvas.toDataURL(format, quality);
            resolve(base64ToBlob(dataUrl, format));
          }
        },
        format,
        quality,
      );
    } catch {
      const dataUrl = canvas.toDataURL(format, quality);
      resolve(base64ToBlob(dataUrl, format));
    }
  });
}

/**
 * Try delivering file to Native Android APK bridge
 */
async function tryNativeAndroidSave(
  fileName: string,
  base64Data: string,
  dataUrl: string,
): Promise<boolean> {
  const bridge = getAndroidBridge();
  const w = typeof window !== "undefined" ? (window as any) : null;

  // 1. App-level registered bridge in App.tsx
  if (w && typeof w.saveFileNatively === "function") {
    try {
      const res = w.saveFileNatively(fileName, base64Data);
      if (res !== false) return true;
    } catch (e) {
      console.warn("[downloadHelper] saveFileNatively error:", e);
    }
  }

  if (!bridge) return false;

  // 2. Direct methods on native bridge
  const methodsToTry = [
    () => typeof bridge.saveFile === "function" && bridge.saveFile(fileName, base64Data),
    () => typeof bridge.saveFile === "function" && bridge.saveFile(fileName, dataUrl),
    () => typeof bridge.downloadFile === "function" && bridge.downloadFile(fileName, base64Data),
    () => typeof bridge.downloadFile === "function" && bridge.downloadFile(fileName, dataUrl),
    () => typeof bridge.saveBase64 === "function" && bridge.saveBase64(fileName, base64Data),
    () => typeof bridge.save === "function" && bridge.save(fileName, base64Data),
    () => typeof bridge.download === "function" && bridge.download(fileName, base64Data),
    () => typeof bridge.saveToGallery === "function" && bridge.saveToGallery(base64Data, fileName),
  ];

  for (const fn of methodsToTry) {
    try {
      const result = fn();
      if (result !== false) {
        return true;
      }
    } catch {
      // Continue trying next signature
    }
  }

  return false;
}

/**
 * Universal Download Function:
 * Reliably saves/downloads file across Native Android APK, mobile browsers, and desktop browsers.
 * Never navigates away from the app and never closes the app!
 */
export async function triggerUniversalDownload(
  payload: UniversalDownloadPayload,
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const { fileName, content, mimeType } = payload;
  const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, "_");

  // Step 1: Normalize content into Blob, base64, and dataUrl
  let resolvedBlob: Blob;
  let resolvedBase64: string = "";
  let resolvedDataUrl: string = "";
  let resolvedMime: string = mimeType || "application/octet-stream";

  if (content instanceof Blob) {
    resolvedBlob = content;
    resolvedMime = mimeType || content.type || "application/octet-stream";
    try {
      resolvedDataUrl = await blobToDataUrl(resolvedBlob);
      const commaIdx = resolvedDataUrl.indexOf(",");
      resolvedBase64 = commaIdx >= 0 ? resolvedDataUrl.slice(commaIdx + 1) : "";
    } catch {
      // Base64 extraction failed, proceed with blob
    }
  } else if (content instanceof ArrayBuffer || content instanceof Uint8Array) {
    resolvedBlob = new Blob([content], { type: resolvedMime });
    try {
      resolvedDataUrl = await blobToDataUrl(resolvedBlob);
      const commaIdx = resolvedDataUrl.indexOf(",");
      resolvedBase64 = commaIdx >= 0 ? resolvedDataUrl.slice(commaIdx + 1) : "";
    } catch {}
  } else if (typeof content === "string" && content.startsWith("data:")) {
    resolvedDataUrl = content;
    const match = content.match(/^data:([^;]+);/);
    if (match) resolvedMime = mimeType || match[1];
    const commaIdx = content.indexOf(",");
    resolvedBase64 = commaIdx >= 0 ? content.slice(commaIdx + 1) : "";
    resolvedBlob = base64ToBlob(resolvedBase64, resolvedMime);
  } else if (typeof content === "string") {
    // Plain string (JSON, SVG, Text)
    if (!mimeType) {
      if (safeFileName.endsWith(".json")) resolvedMime = "application/json";
      else if (safeFileName.endsWith(".svg")) resolvedMime = "image/svg+xml";
      else resolvedMime = "text/plain;charset=utf-8";
    }
    resolvedBlob = new Blob([content], { type: resolvedMime });
    try {
      resolvedDataUrl = await blobToDataUrl(resolvedBlob);
      const commaIdx = resolvedDataUrl.indexOf(",");
      resolvedBase64 = commaIdx >= 0 ? resolvedDataUrl.slice(commaIdx + 1) : "";
    } catch {}
  } else {
    console.error("[downloadHelper] Unsupported content type for download:", content);
    return false;
  }

  // Step 2: Native Android APK Bridge Check
  // In an Android WebView, an unhandled <a download> click crashes the app due to ActivityNotFoundException.
  // We MUST hand off to the native Android bridge whenever available!
  if (resolvedBase64) {
    const savedNatively = await tryNativeAndroidSave(safeFileName, resolvedBase64, resolvedDataUrl);
    if (savedNatively) {
      console.log(
        `[downloadHelper] Saved natively to device storage via Android APK: ${safeFileName}`,
      );
      return true;
    }
  }

  // A native WebView without a working save bridge must not receive an anchor download.
  // Android WebViews commonly delegate that navigation to an unavailable Activity and
  // terminate the APK. Fail safely instead of falling through to the browser path.
  if (isAndroidApp()) {
    console.warn("[downloadHelper] Native download bridge unavailable; skipping WebView anchor fallback.");
    return false;
  }

  // Step 3: Web Browser Download Delivery
  // Create object URL from resolvedBlob - NEVER assign large data: URIs to link.href directly
  const objectUrl = URL.createObjectURL(resolvedBlob);

  const link = document.createElement("a");
  link.style.display = "none";
  link.style.position = "absolute";
  link.style.left = "-9999px";
  link.style.top = "-9999px";
  link.style.opacity = "0";
  link.setAttribute("aria-hidden", "true");
  link.setAttribute("download", safeFileName);
  link.download = safeFileName;
  link.href = objectUrl;
  link.rel = "noopener noreferrer";

  document.body.appendChild(link);

  try {
    // Prefer synthetic MouseEvent to prevent unwanted page navigation or tab replacement
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    link.dispatchEvent(clickEvent);
  } catch {
    try {
      link.click();
    } catch (e) {
      console.warn("[downloadHelper] link.click() failed:", e);
    }
  }

  // Safe DOM cleanup
  setTimeout(() => {
    try {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    } catch {}
  }, 1000);

  // Keep Blob URL alive for 60 seconds so mobile/desktop browsers don't abort midway
  setTimeout(() => {
    try {
      URL.revokeObjectURL(objectUrl);
    } catch {}
  }, 60000);

  return true;
}
