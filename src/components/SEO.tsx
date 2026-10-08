import React, { useEffect } from "react";

/**
 * SEO component that injects route-specific meta tags, Open Graph / Twitter
 * cards, canonical links, and JSON-LD structured data into the document head.
 *
 * Usage:
 *   <SEO
 *     title="Events | StudentHub MKU"
 *     description="Browse and RSVP to upcoming campus events at Mount Kenya University..."
 *     path="/events"
 *     keywords="MKU events, campus activities, moot court"
 *     image="https://www.studenthubmku.xyz/og-cover.jpg"
 *     jsonLd={...}
 *   />
 */

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  keywords?: string;
  image?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  noIndex?: boolean;
  siteName?: string;
  twitterHandle?: string;
}

const SITE_URL = "https://www.studenthubmku.xyz";
const DEFAULT_IMAGE = `${SITE_URL}/og-cover.jpg`;
const DEFAULT_SITE_NAME = "StudentHub MKU";
const DEFAULT_TWITTER = "@studenthubmku";

export function SEO({
  title,
  description,
  path = "/",
  keywords,
  image = DEFAULT_IMAGE,
  jsonLd,
  noIndex = false,
  siteName = DEFAULT_SITE_NAME,
  twitterHandle = DEFAULT_TWITTER
}: SEOProps) {
  const fullTitle = title.includes("|") ? title : `${title} | ${siteName}`;
  const canonicalUrl = `${SITE_URL}${path.startsWith("/") ? path : "/" + path}`;

  useEffect(() => {
    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const setLink = (rel: string, href: string) => {
      if (!href) return;
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    // Title
    document.title = fullTitle;

    // Core meta
    setMeta("description", description);
    if (keywords) setMeta("keywords", keywords);
    setMeta("robots", noIndex ? "noindex, nofollow" : "index, follow");

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:image", image, "property");
    setMeta("og:url", canonicalUrl, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:site_name", siteName, "property");
    setMeta("og:locale", "en_US", "property");

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:site", twitterHandle);
    setMeta("twitter:creator", twitterHandle);
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", image);

    // Canonical
    setLink("canonical", canonicalUrl);

    // JSON-LD structured data
    const existingScript = document.querySelector('script[type="application/ld+json"][data-seo="true"]');
    if (existingScript) existingScript.remove();

    if (jsonLd) {
      const script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute("data-seo", "true");
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [fullTitle, description, canonicalUrl, image, keywords, noIndex, siteName, twitterHandle, jsonLd]);

  return null;
}

/**
 * Default structured data for the StudentHub MKU organisation.
 */
export const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "StudentHub MKU",
  "url": "https://www.studenthubmku.xyz",
  "logo": "https://www.studenthubmku.xyz/icon-white-on-black.svg",
  "description": "StudentHub is the official student portal for Mount Kenya University School of Law — campus updates, events, marketplace, clubs, gallery, and newsletter broadcasting.",
  "sameAs": [
    "https://www.facebook.com/studenthubmku",
    "https://www.instagram.com/studenthubmku",
    "https://x.com/studenthubmku"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Student Services",
    "email": "studenthubmku@gmail.com"
  }
};

export const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "StudentHub MKU",
  "url": "https://www.studenthubmku.xyz",
  "description": "The Mount Kenya University School of Law student portal — events, marketplace, clubs, gallery, bulletins, and the anonymous Vault.",
  "publisher": ORGANIZATION_JSON_LD,
  "potentiallyAction": {
    "@type": "SearchAction",
    "target": "https://www.studenthubmku.xyz/events?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};