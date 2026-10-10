/* ============================================================
   STUDENTHUB MKU — SERVICE WORKER
   Only intercepts LOCAL precached hero assets so they paint
   instantly (<0.1s) on cold starts. Remote images (ImgBB,
   Unsplash, Firebase Storage) are left to the browser's
   native HTTP cache + CORS-safe image pipeline so they render
   correctly instead of decoding as black/broken files.
   ============================================================ */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `studenthub-static-${CACHE_VERSION}`;

// Local precached hero seed images bundled with the build.
const PRECACHED_IMAGES = [
  "/hero/hero-1.webp",
  "/hero/hero-2.webp",
  "/hero/hero-3.webp",
  "/hero/hero-4.webp",
  "/hero/hero-5.webp",
  "/hero/hero-6.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Precache local seed images so they are ready on cold start.
      await cache.addAll(PRECACHED_IMAGES).catch(() => {});
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Purge stale caches from previous versions.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );
      self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = req.url;

  // Only serve LOCAL precached assets from cache. Never intercept
  // cross-origin image requests — doing so changes CORS semantics and
  // causes remote ImgBB/Unsplash images to decode as broken/black files.
  if (
    url.startsWith(self.location.origin) &&
    PRECACHED_IMAGES.some((p) => url.endsWith(p))
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }
});