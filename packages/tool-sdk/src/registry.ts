import { categories, getCategoryMeta } from "./categories";
import { toolRecords } from "./generated/registry";
import { getToolsByCategory, groupToolsByCategory, searchTools } from "./search";
import type { ToolCategory } from "@tool-platform/tool-contracts";

export { categories, getCategoryMeta, searchTools, groupToolsByCategory, getToolsByCategory };
export type { CategoryMeta, ToolClientProps, ToolManifest, ToolRecord, ToolRuntime } from "@tool-platform/tool-contracts";

export function getAllToolRecords() {
  return toolRecords;
}

export function getAllTools() {
  return toolRecords.map((record) => record.manifest);
}

export function getFeaturedTools() {
  return toolRecords
    .map((record) => record.manifest)
    .filter((tool) => tool.featured);
}

export function getToolRecord(id: string) {
  return toolRecords.find((record) => record.manifest.id === id) ?? null;
}

export function getCategoryCount(category: ToolCategory) {
  return getToolsByCategory(getAllTools(), category).length;
}
