// @ts-nocheck
import { openDB } from "idb";

const STORE_NAME = "activeImages";
const DB_NAME = "BigstaActiveImageDB";
const DB_VERSION = 1;

export async function saveActiveImageStorage(
  dataUrl: string,
  metadata: { name?: string; service?: string } = {},
) {
  try {
    // 1. Save to localStorage as quick fallback
    localStorage.setItem("bigsta_active_photo", dataUrl);
    localStorage.setItem(
      "bigsta_active_meta",
      JSON.stringify({ ...metadata, updatedAt: Date.now() }),
    );

    // 2. Save to IndexedDB for robust large image persistence across sessions
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      },
    });

    await db.put(STORE_NAME, {
      id: "current_active_image",
      dataUrl,
      metadata,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn("Failed to save active image to storage:", err);
  }
}

export async function loadActiveImageStorage(): Promise<{ dataUrl: string; metadata: any } | null> {
  try {
    // 1. Try IndexedDB first
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      },
    });

    const record = await db.get(STORE_NAME, "current_active_image");
    if (record && record.dataUrl) {
      return { dataUrl: record.dataUrl, metadata: record.metadata || {} };
    }

    // 2. Fallback to localStorage
    const localUrl = localStorage.getItem("bigsta_active_photo");
    if (localUrl) {
      const metaStr = localStorage.getItem("bigsta_active_meta");
      const metadata = metaStr ? JSON.parse(metaStr) : {};
      return { dataUrl: localUrl, metadata };
    }
  } catch (err) {
    console.warn("Failed to load active image from storage:", err);
  }
  return null;
}

export async function clearActiveImageStorage() {
  try {
    localStorage.removeItem("bigsta_active_photo");
    localStorage.removeItem("bigsta_active_meta");
    const db = await openDB(DB_NAME, DB_VERSION);
    await db.delete(STORE_NAME, "current_active_image");
  } catch (err) {
    console.warn("Failed to clear active image storage:", err);
  }
}
