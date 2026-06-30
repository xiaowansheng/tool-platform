import type { MetadataRoute } from "next";

import { categories, getAllTools } from "@tool-platform/tool-sdk";

import { COMMON_TOOLS_CATEGORY_ID, FAVORITE_TOOLS_CATEGORY_ID } from "@/lib/common-tools";
import { routing } from "@/i18n/routing";

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tool-platform.local").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const tools = getAllTools();

  return [
    ...routing.locales.flatMap((locale) => [
      {
        url: `${baseUrl}/${locale}/`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 1,
      },
      {
        url: `${baseUrl}/${locale}/categories/${COMMON_TOOLS_CATEGORY_ID}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.8,
      },
      {
        url: `${baseUrl}/${locale}/categories/${FAVORITE_TOOLS_CATEGORY_ID}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.8,
      },
      ...categories.map((category) => ({
        url: `${baseUrl}/${locale}/categories/${category.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...tools.map((tool) => ({
        url: `${baseUrl}/${locale}/tools/${tool.id}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ]),
  ];
}
