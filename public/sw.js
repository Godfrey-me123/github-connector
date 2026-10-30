// BIGsta service worker — offline-first shell + media cache.
// Bump CACHE_VERSION when the precache list changes. Only caches whose name
// starts with "bigsta-" are ever deleted; user documents live in IndexedDB and
// are never touched here.
const CACHE_VERSION = "bigsta-v2";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
// Template backgrounds / uploaded images from Supabase Storage. Kept across
// versions so previously downloaded backgrounds keep working offline.
const MEDIA_CACHE = "bigsta-media";
const MEDIA_MAX_ENTRIES = 400;

const APP_SHELL = [
  "/",
  "/favicon.ico",
  "/fonts/ManualTypewriter-Regular.ttf",
  "/fonts/ManualTypewriter-Bold.ttf",
  "/fonts/CourierPrime-Regular.ttf",
  "/fonts/CourierPrime-Bold.ttf",
  "/fonts/SpecialElite-Regular.ttf",
  "/fonts/CooperBlack.ttf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      // Add individually so one missing file can't block the whole install.
      .then((cache) => Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("bigsta-") && key !== MEDIA_CACHE && !key.startsWith(CACHE_VERSION),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function isSupabaseMedia(url) {
  return url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/public/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Public storage images (template backgrounds): cache-first, refresh in background.
  if (isSupabaseMedia(url)) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok || response.type === "opaque") {
              cache.put(request, response.clone());
              trimCache(MEDIA_CACHE, MEDIA_MAX_ENTRIES);
            }
            return response;
          })
          .catch(() => cached || Response.error());
        return cached || network;
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  // Never cache live data: API, payments, health probes.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  const isEssentialAsset =
    ["script", "style", "font", "image", "worker"].includes(request.destination) ||
    /\.(js|mjs|css|wasm|ttf|woff2?|png|jpe?g|webp|svg)$/.test(url.pathname);
  if (!isEssentialAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || Response.error());
      return cached || network;
    }),
  );
});
