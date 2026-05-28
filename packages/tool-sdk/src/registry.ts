import { categories, getCategoryMeta } from "./categories";
import { toolManifests } from "./generated/manifests";
import { getToolsByCategory, groupToolsByCategory, searchTools } from "./search";
import type { ToolCategory } from "@tool-platform/tool-contracts";

export { categories, getCategoryMeta, searchTools, groupToolsByCategory, getToolsByCategory };
export type { CategoryMeta, ToolClientProps, ToolManifest, ToolRecord, ToolRuntime } from "@tool-platform/tool-contracts";

export function getAllTools() {
  return toolManifests;
}

export function getFeaturedTools() {
  return toolManifests.filter((tool) => tool.featured);
}

export function getToolManifest(id: string) {
  return toolManifests.find((tool) => tool.id === id) ?? null;
}

export function getCategoryCount(category: ToolCategory) {
  return getToolsByCategory(getAllTools(), category).length;
}
