import type { MetadataRoute } from "next";

import { categories, getAllTools } from "@tool-platform/tool-sdk";

const baseUrl = "https://tool-platform.local";

export default function sitemap(): MetadataRoute.Sitemap {
  const tools = getAllTools();

  return [
    {
      url: `${baseUrl}/`
    },
    {
      url: `${baseUrl}/search`
    },
    ...categories.map((category) => ({
      url: `${baseUrl}/categories/${category.id}`
    })),
    ...tools.map((tool) => ({
      url: `${baseUrl}/tools/${tool.id}`
    }))
  ];
}
