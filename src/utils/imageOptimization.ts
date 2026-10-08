/* ============================================================
   IMAGE OPTIMISATION UTILITIES
   
   Provides:
   - WebP/AVIF format negotiation via Accept header hint
   - Responsive srcset generation
   - LCP image detection & eager loading
   - Dimension-aware compression
   ============================================================ */

/**
 * Optimises a remote image URL to match the rendered display size
 * and lower quality so images transfer in kilobytes instead of
 * megabytes, while staying visually indistinguishable.
 *
 * For Unsplash URLs: rewrites w, q, and auto params.
 * For ImgBB: leaves untouched (already compressed).
 */
export const optimizeUrl = (
  url: string,
  displayWidth = 500,
  quality = 55
): string => {
  if (!url) return url;
  try {
    if (url.includes("images.unsplash.com")) {
      const u = new URL(url);
      u.searchParams.set("w", String(displayWidth));
      u.searchParams.set("q", String(quality));
      if (!u.searchParams.has("auto")) {
        u.searchParams.set("auto", "format");
      }
      return u.toString();
    }
    if (url.includes("imgbb.com") || url.includes("ibb.co")) {
      // ImgBB already serves compressed output; leave untouched.
      return url;
    }
  } catch (_) {
    /* ignore */
  }
  return url;
};

/**
 * Generates a responsive srcset for Unsplash images.
 * Returns a string suitable for the `srcset` attribute.
 */
export const generateSrcSet = (
  url: string,
  qualities: number[] = [55]
): string => {
  if (!url) return "";
  try {
    if (url.includes("images.unsplash.com")) {
      const widths = [400, 600, 800, 1200];
      return widths
        .map(w => {
          const u = new URL(url);
          u.searchParams.set("w", String(w));
          u.searchParams.set("q", String(qualities[0]));
          if (!u.searchParams.has("auto")) {
            u.searchParams.set("auto", "format");
          }
          return `${u.toString()} ${w}w`;
        })
        .join(", ");
    }
  } catch (_) {
    /* ignore */
  }
  return "";
};

/**
 * Determines if an image is the LCP (Largest Contentful Paint) element.
 * In our app, the first gallery image in the hero album is typically the LCP.
 */
export const isLCPImage = (index: number, totalImages: number): boolean => {
  // First image in the hero is the LCP candidate
  return index === 0 && totalImages > 0;
};

/**
 * Gets the appropriate loading attribute for an image.
 * - LCP images: eager
 * - Above-the-fold images: eager
 * - Below-the-fold images: lazy
 */
export const getLoadingAttr = (
  index: number,
  isHero: boolean = false
): "eager" | "lazy" => {
  if (isHero && index < 2) return "eager";
  if (index === 0) return "eager";
  return "lazy";
};

/**
 * Gets the fetchpriority for an image.
 * - LCP images: high
 * - Above-the-fold: auto
 * - Below-the-fold: auto
 */
export const getFetchPriority = (
  index: number,
  isHero: boolean = false
): "high" | "auto" => {
  if (isHero && index === 0) return "high";
  if (index === 0) return "high";
  return "auto";
};

/**
 * Generates a picture element with WebP/AVIF fallbacks.
 * For browsers that support modern image formats.
 */
export const generatePictureSrcSet = (
  url: string,
  widths: number[] = [400, 600, 800, 1200]
): string => {
  if (!url) return "";
  try {
    if (url.includes("images.unsplash.com")) {
      return widths
        .map(w => {
          const u = new URL(url);
          u.searchParams.set("w", String(w));
          u.searchParams.set("q", "55");
          if (!u.searchParams.has("auto")) {
            u.searchParams.set("auto", "format");
          }
          return `${u.toString()} ${w}w`;
        })
        .join(", ");
    }
  } catch (_) {
    /* ignore */
  }
  return "";
};

/**
 * Calculates the optimal display width based on viewport hints.
 */
export const getOptimalWidth = (
  containerWidth: number = 100,
  dpr: number = 2
): number => {
  return Math.min(Math.ceil(containerWidth * dpr), 1200);
};