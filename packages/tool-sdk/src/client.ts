import { toolAppLoaders } from "./generated/client-loaders";

export type { ToolAppLoader, ToolAppModule } from "./generated/client-loaders";

export function getToolAppLoader(id: string) {
  return toolAppLoaders[id as keyof typeof toolAppLoaders] ?? null;
}

export async function loadToolApp(id: string) {
  const loader = getToolAppLoader(id);

  if (!loader) {
    return null;
  }

  const module = await loader();
  return module.default;
}
