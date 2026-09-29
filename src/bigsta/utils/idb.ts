import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CardTemplate, UploadedBackground, SavedMergeLayout } from '../types';

export interface DownloadRecord {
  id: string;
  fileName: string;
  service: string;
  format: 'PDF' | 'PNG' | 'JPG' | 'JSON' | 'SVG';
  date: string;
  timestamp: number;
  dataUrl: string; // Base64 or Object URL / HTTPS download URL
  status: 'QUEUED' | 'GENERATING' | 'READY' | 'DOWNLOADING' | 'COMPLETED' | 'DOWNLOADED' | 'FAILED';
  sizeBytes?: number;
  failureReason?: string;
  progressPercent?: number;
  queuePosition?: number;
  userId?: string;
}

export interface StudioDraftRecord {
  serviceId: string;
  template: CardTemplate;
  updatedAt: string;
}

interface IDBTemplateStudioDB extends DBSchema {
  templates: {
    key: string;
    value: CardTemplate;
    indexes: { 'by-updated': string };
  };
  generatedCards: {
    key: string;
    value: {
      id: string;
      templateId: string;
      templateName: string;
      data: Record<string, string>;
      generatedAt: string;
      previewImage?: string;
    };
    indexes: { 'by-generated': string };
  };
  backgrounds: {
    key: string;
    value: UploadedBackground;
    indexes: { 'by-created': string };
  };
  mergeLayouts: {
    key: string;
    value: SavedMergeLayout;
    indexes: { 'by-updated': string };
  };
  downloads: {
    key: string;
    value: DownloadRecord;
    indexes: { 'by-timestamp': number };
  };
  studioDrafts: {
    key: string;
    value: StudioDraftRecord;
    indexes: { 'by-updated': string };
  };
}

const DB_NAME = 'IDTemplateStudioDB';
const DB_VERSION = 5;

let dbPromise: Promise<IDBPDatabase<IDBTemplateStudioDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<IDBTemplateStudioDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1 || !db.objectStoreNames.contains('templates')) {
          const templateStore = db.createObjectStore('templates', { keyPath: 'id' });
          templateStore.createIndex('by-updated', 'updatedAt');
        }

        if (oldVersion < 1 || !db.objectStoreNames.contains('generatedCards')) {
          const generatedStore = db.createObjectStore('generatedCards', { keyPath: 'id' });
          generatedStore.createIndex('by-generated', 'generatedAt');
        }

        if (oldVersion < 2 || !db.objectStoreNames.contains('backgrounds')) {
          const bgStore = db.createObjectStore('backgrounds', { keyPath: 'id' });
          bgStore.createIndex('by-created', 'createdAt');
        }

        if (oldVersion < 3 || !db.objectStoreNames.contains('mergeLayouts')) {
          const mergeStore = db.createObjectStore('mergeLayouts', { keyPath: 'id' });
          mergeStore.createIndex('by-updated', 'updatedAt');
        }

        if (oldVersion < 4 || !db.objectStoreNames.contains('downloads')) {
          const downloadsStore = db.createObjectStore('downloads', { keyPath: 'id' });
          downloadsStore.createIndex('by-timestamp', 'timestamp');
        }

        if (oldVersion < 5 || !db.objectStoreNames.contains('studioDrafts')) {
          const draftStore = db.createObjectStore('studioDrafts', { keyPath: 'serviceId' });
          draftStore.createIndex('by-updated', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveTemplateDB(template: CardTemplate): Promise<void> {
  const db = await getDB();
  await db.put('templates', template);
}

export async function getAllTemplatesDB(): Promise<CardTemplate[]> {
  const db = await getDB();
  const templates = await db.getAllFromIndex('templates', 'by-updated');
  return templates.reverse(); // Most recent first
}

export async function getTemplateByIdDB(id: string): Promise<CardTemplate | undefined> {
  const db = await getDB();
  return db.get('templates', id);
}

export async function deleteTemplateDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('templates', id);
}

export async function saveGeneratedCardDB(cardRecord: {
  id: string;
  templateId: string;
  templateName: string;
  data: Record<string, string>;
  generatedAt: string;
  previewImage?: string;
}): Promise<void> {
  const db = await getDB();
  await db.put('generatedCards', cardRecord);
}

export async function getAllGeneratedCardsDB() {
  const db = await getDB();
  const cards = await db.getAllFromIndex('generatedCards', 'by-generated');
  return cards.reverse();
}

export async function deleteGeneratedCardDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('generatedCards', id);
}

export async function saveBackgroundDB(bg: UploadedBackground): Promise<void> {
  const db = await getDB();
  await db.put('backgrounds', bg);
}

export async function getAllBackgroundsDB(): Promise<UploadedBackground[]> {
  const db = await getDB();
  const bgs = await db.getAllFromIndex('backgrounds', 'by-created');
  return bgs.reverse();
}

export async function deleteBackgroundDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('backgrounds', id);
}

export async function saveMergeLayoutDB(layout: SavedMergeLayout): Promise<void> {
  const db = await getDB();
  await db.put('mergeLayouts', layout);
}

export async function getAllMergeLayoutsDB(): Promise<SavedMergeLayout[]> {
  const db = await getDB();
  const layouts = await db.getAllFromIndex('mergeLayouts', 'by-updated');
  return layouts.reverse();
}

export async function deleteMergeLayoutDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('mergeLayouts', id);
}

// ==========================================
// DOWNLOADS HISTORY
// ==========================================

export async function saveDownloadRecordDB(record: DownloadRecord): Promise<void> {
  const db = await getDB();
  await db.put('downloads', record);
}

export async function getAllDownloadRecordsDB(): Promise<DownloadRecord[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex('downloads', 'by-timestamp');
  return records.reverse(); // Newest first
}

export async function deleteDownloadRecordDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('downloads', id);
}

// ==========================================
// STUDIO DRAFTS PERSISTENCE (IndexedDB - Quota Safe)
// ==========================================

export async function saveStudioDraftDB(serviceId: string, template: CardTemplate): Promise<void> {
  try {
    const db = await getDB();
    await db.put('studioDrafts', {
      serviceId,
      template,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to save studio draft to IndexedDB:', err);
  }
}

export async function getStudioDraftDB(serviceId: string): Promise<CardTemplate | null> {
  try {
    const db = await getDB();
    const record = await db.get('studioDrafts', serviceId);
    return record ? record.template : null;
  } catch (err) {
    console.error('Failed to get studio draft from IndexedDB:', err);
    return null;
  }
}

export async function deleteStudioDraftDB(serviceId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('studioDrafts', serviceId);
  } catch (err) {
    console.error('Failed to delete studio draft from IndexedDB:', err);
  }
}

