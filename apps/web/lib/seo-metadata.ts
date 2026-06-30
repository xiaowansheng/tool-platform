import type { Metadata } from "next";
import type { ToolManifest } from "@tool-platform/tool-contracts";

export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tool-platform.local").replace(/\/$/, "");

export const SITE_NAME = "Tool Platform";

export const DEFAULT_DESCRIPTION = "基于 Manifest 的浏览器端插件化工具平台。";

export const DEFAULT_DESCRIPTION_EN =
  "A browser-based plugin tool platform powered by Manifest. Discover tools for developers, designers, and productivity.";

export function getOgImageUrl(path: string = "/icon.svg") {
  return `${SITE_URL}${path}`;
}

export function translatePath(path: string, fromLocale: string, toLocale: string) {
  return path.replace(`/${fromLocale}/`, `/${toLocale}/`);
}

export function buildCanonicalUrl(path: string) {
  return `${SITE_URL}${path}`;
}

export function buildToolJsonLd(manifest: ToolManifest & { icon?: string }, locale: string) {
  const url = `${SITE_URL}/${locale}/tools/${manifest.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: manifest.name,
    description: manifest.description,
    url,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    ...(manifest.tags.length > 0 ? { keywords: manifest.tags.join(", ") } : {}),
  };
}

export function buildCategoryJsonLd(
  categoryName: string,
  categoryDescription: string,
  locale: string,
  categoryId: string,
) {
  const url = `${SITE_URL}/${locale}/categories/${categoryId}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: categoryName,
    description: categoryDescription,
    url,
  };
}

export function buildSiteJsonLd(locale: string) {
  const url = `${SITE_URL}/${locale}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/${locale}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildPageMetadata({
  title,
  description,
  locale,
  path,
  ogImage,
  ogType = "website",
}: {
  title: string;
  description: string;
  locale: string;
  path: string;
  ogImage?: string;
  ogType?: "website" | "article";
}): Metadata {
  const url = buildCanonicalUrl(path);
  const image = ogImage ?? getOgImageUrl();

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        zh: buildCanonicalUrl(translatePath(path, locale, "zh")),
        en: buildCanonicalUrl(translatePath(path, locale, "en")),
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: locale === "zh" ? "zh_CN" : "en_US",
      type: ogType,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
