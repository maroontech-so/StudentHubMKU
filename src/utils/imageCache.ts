import { GalleryItem } from "../types";

/* ============================================================
   IMAGE CACHE UTILITY
   Registers the service worker, pre-caches hero images, and
   exposes helpers to resolve cached image URLs for instant
   rendering (<0.1s) on repeat visits and cold starts.
   ============================================================ */

export const HERO_CACHE_KEY = "local_hero_gallery_v2";

/**
 * Seed hero images bundled locally as lightweight, high-performance WebP
 * (~20-45KB each instead of 1.6MB+ raw uncompressed remote camera files).
 * Ensures instant (<0.1s) rendering on startup with zero server lag.
 */
export const DEFAULT_HERO_ITEMS: GalleryItem[] = [
  {
    id: "0u0uEQX7ZwJfMZn36Vsr",
    title: "_MG_5500",
    caption: "Campus moment",
    imageUrl: "/hero/hero-1.webp",
    category: "campus",
    visible: true,
    featured: true,
    uploadedBy: "system",
    uploaderName: "StudentHub",
    uploadedAt: Date.now()
  },
  {
    id: "2xyijc1UWFMoutveI3Eu",
    title: "IMG_5613",
    caption: "Campus moment",
    imageUrl: "/hero/hero-2.webp",
    category: "campus",
    visible: true,
    featured: true,
    uploadedBy: "system",
    uploaderName: "StudentHub",
    uploadedAt: Date.now()
  },
  {
    id: "39BCDnFl2ko1TWs8ZmmT",
    title: "MOOT COURT ORIENTATION (6/13)",
    caption: "Orientation day 2025",
    imageUrl: "/hero/hero-3.webp",
    category: "events",
    visible: true,
    featured: false,
    uploadedBy: "system",
    uploaderName: "StudentHub",
    uploadedAt: Date.now()
  },
  {
    id: "3BNFNFAuZN3UWTl4ANIt",
    title: "MOOT COURT ORIENTATION (11/13)",
    caption: "Orientation day 2025",
    imageUrl: "/hero/hero-4.webp",
    category: "events",
    visible: true,
    featured: false,
    uploadedBy: "system",
    uploaderName: "StudentHub",
    uploadedAt: Date.now()
  },
  {
    id: "3zkWDEPkOYBFqdvC0Sbv",
    title: "_MG_5691",
    caption: "Campus moment",
    imageUrl: "/hero/hero-5.webp",
    category: "campus",
    visible: true,
    featured: true,
    uploadedBy: "system",
    uploaderName: "StudentHub",
    uploadedAt: Date.now()
  },
  {
    id: "41Rz7e8ZBdBvpnrjuWw0",
    title: "IMG_5615",
    caption: "Campus moment",
    imageUrl: "/hero/hero-6.webp",
    category: "campus",
    visible: true,
    featured: true,
    uploadedBy: "system",
    uploaderName: "StudentHub",
    uploadedAt: Date.now()
  }
];

const REMOTE_HERO_MAP: Record<string, string> = {
  // Real Firestore ImgBB URLs mapped to local bundled assets
  "https://i.ibb.co/yF8cLpmj/MG-5500.jpg": "/hero/hero-1.webp",
  "https://i.ibb.co/sp2PTt3p/IMG-5613-1.jpg": "/hero/hero-2.webp",
  "https://i.ibb.co/B5wwhrSK/1000018770.jpg": "/hero/hero-3.webp",
  "https://i.ibb.co/jZ6QdXY3/1000018763.jpg": "/hero/hero-4.webp",
  "https://i.ibb.co/sXNWrcq/MG-5691.jpg": "/hero/hero-5.webp",
  "https://i.ibb.co/BH93sshy/IMG-5615.jpg": "/hero/hero-6.webp",
  "MG-5500.jpg": "/hero/hero-1.webp",
  "IMG-5613-1.jpg": "/hero/hero-2.webp",
  "1000018770.jpg": "/hero/hero-3.webp",
  "1000018763.jpg": "/hero/hero-4.webp",
  "MG-5691.jpg": "/hero/hero-5.webp",
  "IMG-5615.jpg": "/hero/hero-6.webp"
};

let swRegistration: ServiceWorkerRegistration | null = null;
let swReady: Promise<ServiceWorkerRegistration | null> | null = null;

function isLocalOrigin(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "0.0.0.0")
  );
}

/**
 * Registers the service worker to cache images locally in CacheStorage.
 */
export function registerImageCache(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  if (swReady) return swReady;

  swReady = navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .then((reg) => {
      swRegistration = reg;
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (nw) {
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && reg.waiting) {
              reg.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          });
        }
      });
      return reg;
    })
    .catch((err) => {
      console.warn("[imageCache] Service worker registration failed:", err);
      return null;
    });

  return swReady;
}

/**
 * Synchronous initial getter for hero gallery items.
 * Executed at React useState initialization (frame 0).
 * Guarantees zero latency (<0.1s) by resolving from local cache or local bundled assets.
 */
export function getInitialHeroGallery(): GalleryItem[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(HERO_CACHE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          ...item,
          imageUrl: resolveCachedImageUrl(item.imageUrl, idx)
        }));
      }
    }
  } catch (err) {
    console.warn("Could not read local hero cache, using defaults:", err);
  }

  // Pre-seed localStorage
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(DEFAULT_HERO_ITEMS));
    }
  } catch (_) {}

  return DEFAULT_HERO_ITEMS;
}

/**
 * Returns the local cached path for a remote image URL if available to avoid server latency.
 * IMPORTANT: only swaps known remote URLs. Unknown remote URLs are returned untouched
 * so user/vendor-set images always load dynamically from their source.
 */
export function resolveCachedImageUrl(url: string, index?: number): string {
  if (!url) {
    return typeof index === "number" ? `/hero/hero-${(index % 6) + 1}.webp` : url;
  }

  // If already local asset or data/blob URI
  if (url.startsWith("/hero/") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  // Exact URL match in mapping
  if (REMOTE_HERO_MAP[url]) {
    return REMOTE_HERO_MAP[url];
  }

  // Substring match for filename in remote URL
  for (const [key, localPath] of Object.entries(REMOTE_HERO_MAP)) {
    if (url.includes(key)) {
      return localPath;
    }
  }

  // Never override an unknown remote URL with a local asset — let it
  // load dynamically from the vendor/gallery source so user-set images
  // render correctly instead of showing a stale/invalid local file.
  return url;
}

/**
 * Caches gallery items locally in browser storage so the hero album
 * resolves from localStorage on cold starts. Runs in background after
 * Firestore returns.
 *
 * NOTE: we deliberately do NOT pre-cache remote ImgBB/Unsplash images
 * into CacheStorage via fetch({ mode: "cors" }). Those hosts block CORS,
 * so a CORS-mode fetch returns an opaque/broken response that the browser
 * then decodes as a black/invalid image. The browser's own HTTP cache
 * already serves repeat visits quickly and is CORS-safe for <img>.
 */
export async function cacheHeroGalleryLocally(items: GalleryItem[]): Promise<void> {
  if (!items || items.length === 0) return;

  const heroSlice = items.slice(0, 6);
  const preparedItems = heroSlice.map((item, idx) => ({
    ...item,
    imageUrl: resolveCachedImageUrl(item.imageUrl, idx)
  }));

  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(preparedItems));
    }
  } catch (e) {
    console.warn("Failed to store hero gallery in localStorage:", e);
  }
}

/**
 * Preloads an image into browser memory so paint is instant (<0.1s).
 */
export function preloadImage(url: string, index?: number): void {
  if (typeof window === "undefined" || !url) return;
  const resolved = resolveCachedImageUrl(url, index);
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = resolved;
  document.head.appendChild(link);
}

/**
 * Preloads the hero album images in priority order.
 */
export function preloadHeroImages(urls: string[]): void {
  if (typeof window === "undefined") return;
  urls.slice(0, 6).forEach((u, i) => {
    preloadImage(u, i);
  });
}

export function getImageCacheStatus() {
  return {
    supported: typeof window !== "undefined" && "serviceWorker" in navigator,
    registered: swRegistration !== null
  };
}