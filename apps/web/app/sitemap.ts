import type { MetadataRoute } from "next";

import { categories, getAllTools } from "@tool-platform/tool-sdk";
import { routing } from "@/i18n/routing";

const baseUrl = "https://tool-platform.local";

export default function sitemap(): MetadataRoute.Sitemap {
  const tools = getAllTools();

  return [
    ...routing.locales.flatMap((locale) => [
      {
        url: `${baseUrl}/${locale}/`
      },
      {
        url: `${baseUrl}/${locale}/search`
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
