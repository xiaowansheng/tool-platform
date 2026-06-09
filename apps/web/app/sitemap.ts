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
        url: `${baseUrl}/${locale}/`
      },
      {
        url: `${baseUrl}/${locale}/categories/${COMMON_TOOLS_CATEGORY_ID}`
      },
      {
        url: `${baseUrl}/${locale}/categories/${FAVORITE_TOOLS_CATEGORY_ID}`
      },
      ...categories.map((category) => ({
        url: `${baseUrl}/${locale}/categories/${category.id}`
      })),
      ...tools.map((tool) => ({
        url: `${baseUrl}/${locale}/tools/${tool.id}`
      }))
    ])
  ];
}
