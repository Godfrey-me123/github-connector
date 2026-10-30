// Silent offline template prefetch.
// Template definitions are already mirrored to IndexedDB by loadSavedTemplates();
// this downloads every image they reference (front/back backgrounds, layer images)
// into the persistent "bigsta-media" Cache Storage bucket so card generation is
// fast and works offline. Runs in the background with no UI, and ONLY for users
// who currently have tokens (admins always qualify).

const CACHE_NAME = "bigsta-media";
const CONCURRENCY = 3;
const MIN_INTERVAL_MS = 10 * 60 * 1000;

let running = false;
let lastRun = 0;

/** Who may prefetch. Exported for tests. */
export function canPrefetch(state: {
  authRole?: string | null;
  currentAuthKey?: string | null;
  activePasskeys?: Array<{
    key: string;
    active?: boolean;
    remainingUsages?: number;
    paymentStatus?: string;
  }>;
}): boolean {
  if (state.authRole === "admin") return true;
  if (!state.authRole || !state.currentAuthKey) return false;
  const key = state.currentAuthKey.toLowerCase();
  const pk = (state.activePasskeys || []).find((p) => p.key?.toLowerCase() === key);
  if (!pk || pk.active === false) return false;
  if (pk.paymentStatus === "EXHAUSTED" || pk.paymentStatus === "REJECTED") return false;
  return (pk.remainingUsages ?? 0) > 0;
}

/** Collect every remote image URL referenced by templates. Exported for tests. */
export function collectTemplateImageUrls(templates: any[]): string[] {
  const urls = new Set<string>();
  const add = (src?: unknown) => {
    if (typeof src === "string" && /^https?:\/\//.test(src)) urls.add(src);
  };
  for (const t of templates || []) {
    add(t?.background?.type === "image" ? t.background.src : undefined);
    add(t?.thumbnail);
    add(t?.previewUrl);
    for (const layer of t?.layers || []) {
      if (layer?.type === "image" || layer?.type === "sticker") add(layer.src);
    }
  }
  return [...urls];
}

export async function prefetchTemplatesSilently(state: any, templates: any[]): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  if (running || Date.now() - lastRun < MIN_INTERVAL_MS) return;
  if (!canPrefetch(state)) return;
  if (navigator.onLine === false) return;
  // Respect data-saver on mobile.
  if ((navigator as any).connection?.saveData) return;

  running = true;
  lastRun = Date.now();
  try {
    const cache = await caches.open(CACHE_NAME);
    const queue = collectTemplateImageUrls(templates);
    const worker = async () => {
      while (queue.length) {
        const url = queue.shift()!;
        try {
          if (await cache.match(url)) continue;
          const res = await fetch(url, { mode: "cors", credentials: "omit" });
          if (res.ok) await cache.put(url, res);
        } catch {
          // Silent: a failed prefetch must never affect the user.
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } finally {
    running = false;
  }
}
