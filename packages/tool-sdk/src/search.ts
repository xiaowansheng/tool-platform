import type { ToolCategory, ToolManifest } from "@tool-platform/tool-contracts";

import { categories, getCategoryMeta } from "./categories";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function searchTools(tools: ToolManifest[], query: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return tools;
  }

  return tools.filter((tool) => {
    const category = getCategoryMeta(tool.category);
    const haystacks = [
      tool.name,
      tool.description,
      tool.category,
      category?.label ?? "",
      category?.description ?? "",
      tool.tags.join(" "),
      tool.subCategory ?? ""
    ];

    return haystacks.some((entry) => normalize(entry).includes(normalizedQuery));
  });
}

export function groupToolsByCategory(tools: ToolManifest[]) {
  return categories.map((category) => ({
    category,
    tools: tools.filter((tool) => tool.category === category.id)
  }));
}

export function getToolsByCategory(tools: ToolManifest[], category: ToolCategory) {
  return tools.filter((tool) => tool.category === category);
}
