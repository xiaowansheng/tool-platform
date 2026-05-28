import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const toolsDir = path.join(rootDir, "tools");
const toolSdkDir = path.join(rootDir, "packages", "tool-sdk");
const generatedManifestsPath = path.join(toolSdkDir, "src", "generated", "manifests.ts");
const generatedClientLoadersPath = path.join(toolSdkDir, "src", "generated", "client-loaders.ts");
const toolSdkPackagePath = path.join(toolSdkDir, "package.json");
const preservedToolSdkDependencies = new Set([
  "@tool-platform/tool-contracts"
]);

function pascalCase(value) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

async function loadToolPackages() {
  const packageFiles = await fg("*/package.json", {
    cwd: toolsDir,
    absolute: true
  });

  const tools = await Promise.all(
    packageFiles.map(async (packageFile) => {
      const packageJson = JSON.parse(await fs.readFile(packageFile, "utf8"));
      const toolDir = path.dirname(packageFile);
      const manifestPath = path.join(toolDir, "manifest.ts");
      const toolComponentPath = path.join(toolDir, "ToolClient.tsx");
      const manifestExists = await fileExists(manifestPath);
      const componentExists = await fileExists(toolComponentPath);

      return {
        directoryName: path.basename(toolDir),
        packageName: packageJson.name,
        manifestExists,
        componentExists,
        toolId: manifestExists ? await readManifestId(manifestPath, path.basename(toolDir)) : path.basename(toolDir)
      };
    })
  );

  return tools
    .filter((tool) => tool.manifestExists && tool.componentExists)
    .sort((left, right) => left.directoryName.localeCompare(right.directoryName));
}

async function readManifestId(manifestPath, fallback) {
  const source = await fs.readFile(manifestPath, "utf8");
  const match = source.match(/\bid:\s*["']([^"']+)["']/);

  return match?.[1] ?? fallback;
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function writeManifests(tools) {
  const importLines = [];
  const manifestLines = [];

  for (const tool of tools) {
    const symbol = pascalCase(tool.directoryName);
    importLines.push(`import ${symbol}Manifest from "${tool.packageName}/manifest";`);
    manifestLines.push(`  ${symbol}Manifest`);
  }

  const source = `${importLines.join("\n")}

import type { ToolManifest } from "../types";

export const toolManifests: ToolManifest[] = [
${manifestLines.join(",\n")}
];
`;

  await fs.writeFile(generatedManifestsPath, source, "utf8");
}

async function writeClientLoaders(tools) {
  const loaderLines = tools.map(
    (tool) => `  ${JSON.stringify(tool.toolId)}: () => import("${tool.packageName}/tool")`
  );
  const source = `import type { ComponentType } from "react";

import type { ToolClientProps } from "../types";

export type ToolComponentModule = {
  default: ComponentType<ToolClientProps>;
};

export type ToolComponentLoader = () => Promise<ToolComponentModule>;

export const toolComponentLoaders = {
${loaderLines.join(",\n")}
} satisfies Record<string, ToolComponentLoader>;
`;

  await fs.writeFile(generatedClientLoadersPath, source, "utf8");
}

async function syncToolSdkDependencies(tools) {
  const packageJson = JSON.parse(await fs.readFile(toolSdkPackagePath, "utf8"));
  const nextDependencies = { ...(packageJson.dependencies ?? {}) };

  for (const dependencyName of Object.keys(nextDependencies)) {
    if (dependencyName.startsWith("@tool-platform/") && !preservedToolSdkDependencies.has(dependencyName)) {
      delete nextDependencies[dependencyName];
    }
  }

  for (const tool of tools) {
    nextDependencies[tool.packageName] = "workspace:*";
  }

  packageJson.dependencies = nextDependencies;
  await fs.writeFile(toolSdkPackagePath, JSON.stringify(packageJson, null, 2) + "\n", "utf8");
}

async function main() {
  const tools = await loadToolPackages();

  await writeManifests(tools);
  await writeClientLoaders(tools);
  await syncToolSdkDependencies(tools);

  console.log(`generated ${tools.length} tool registrations`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
