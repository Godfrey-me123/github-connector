// @ts-nocheck
import { openDB } from "idb";

const STORE_NAME = "activeImages";
const DB_NAME = "BigstaActiveImageDB";
const DB_VERSION = 1;

function hasIndexedDB(): boolean {
  return typeof indexedDB !== "undefined";
}

export async function saveActiveImageStorage(
  dataUrl: string,
  metadata: { name?: string; service?: string; sessionId?: string } = {},
) {
  const sessionId = metadata?.sessionId || "default";
  const storageKey = `bigsta_active_photo_${sessionId}`;
  const metaKey = `bigsta_active_meta_${sessionId}`;

  // 1. Save to localStorage scoped by session
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, dataUrl);
      localStorage.setItem(
        metaKey,
        JSON.stringify({ ...metadata, sessionId, updatedAt: Date.now() }),
      );

      // Keep default key for legacy callers
      localStorage.setItem("bigsta_active_photo", dataUrl);
      localStorage.setItem(
        "bigsta_active_meta",
        JSON.stringify({ ...metadata, sessionId, updatedAt: Date.now() }),
      );
    }
  } catch (localErr) {
    console.warn("Failed to save to localStorage:", localErr);
  }

  // 2. Save to IndexedDB if available
  if (hasIndexedDB()) {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "id" });
          }
        },
      });

      await db.put(STORE_NAME, {
        id: `session_${sessionId}`,
        sessionId,
        dataUrl,
        metadata,
        updatedAt: Date.now(),
      });
      await db.put(STORE_NAME, {
        id: "current_active_image",
        sessionId,
        dataUrl,
        metadata,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.warn("Failed to save active image to IndexedDB:", err);
    }
  }
}

export async function loadActiveImageStorage(
  sessionId?: string,
): Promise<{ dataUrl: string; metadata: any } | null> {
  const targetSessionId = sessionId || "default";
  const recordId = sessionId ? `session_${sessionId}` : "current_active_image";

  // 1. Try IndexedDB first if available
  if (hasIndexedDB()) {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "id" });
          }
        },
      });

      const record = await db.get(STORE_NAME, recordId);
      if (record && record.dataUrl) {
        return { dataUrl: record.dataUrl, metadata: record.metadata || {} };
      }
    } catch (err) {
      console.warn("Failed to load active image from IndexedDB:", err);
    }
  }

  // 2. Fallback to localStorage
  try {
    if (typeof localStorage !== "undefined") {
      const storageKey = sessionId
        ? `bigsta_active_photo_${sessionId}`
        : "bigsta_active_photo";
      const metaKey = sessionId
        ? `bigsta_active_meta_${sessionId}`
        : "bigsta_active_meta";

      const localUrl = localStorage.getItem(storageKey);
      if (localUrl) {
        const metaStr = localStorage.getItem(metaKey);
        const metadata = metaStr ? JSON.parse(metaStr) : {};
        return { dataUrl: localUrl, metadata };
      }
    }
  } catch (err) {
    console.warn("Failed to load active image from localStorage:", err);
  }

  return null;
}

export async function clearActiveImageStorage(sessionId?: string) {
  try {
    if (typeof localStorage !== "undefined") {
      if (sessionId) {
        localStorage.removeItem(`bigsta_active_photo_${sessionId}`);
        localStorage.removeItem(`bigsta_active_meta_${sessionId}`);
      }
      localStorage.removeItem("bigsta_active_photo");
      localStorage.removeItem("bigsta_active_meta");
    }

    if (hasIndexedDB()) {
      const db = await openDB(DB_NAME, DB_VERSION);
      if (sessionId) {
        await db.delete(STORE_NAME, `session_${sessionId}`);
      }
      await db.delete(STORE_NAME, "current_active_image");
    }
  } catch (err) {
    console.warn("Failed to clear active image storage:", err);
  }
}
