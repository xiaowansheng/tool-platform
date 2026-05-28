import { toolComponentLoaders } from "./generated/client-loaders";

export type { ToolComponentLoader, ToolComponentModule } from "./generated/client-loaders";

export function getToolComponentLoader(id: string) {
  return toolComponentLoaders[id as keyof typeof toolComponentLoaders] ?? null;
}

export async function loadToolComponent(id: string) {
  const loader = getToolComponentLoader(id);

  if (!loader) {
    return null;
  }

  const module = await loader();
  return module.default;
}
