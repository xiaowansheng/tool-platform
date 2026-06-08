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
      const appEntryPath = path.join(toolDir, "app.tsx");
      const manifestExists = await fileExists(manifestPath);
      const appEntryExists = await fileExists(appEntryPath);
      const directoryName = path.basename(toolDir);

      if (typeof packageJson.name !== "string" || !packageJson.name) {
        throw new Error(`${directoryName}/package.json must define a package name`);
      }

      return {
        directoryName,
        packageName: packageJson.name,
        manifestExists,
        appEntryExists,
        toolId: manifestExists ? await readManifestId(manifestPath, directoryName) : directoryName
      };
    })
  );

  const skippedTools = tools.filter((tool) => !tool.manifestExists || !tool.appEntryExists);

  for (const tool of skippedTools) {
    const missing = [
      tool.manifestExists ? null : "manifest.ts",
      tool.appEntryExists ? null : "app.tsx"
    ].filter(Boolean);
    console.warn(`skipping ${tool.directoryName}: missing ${missing.join(" and ")}`);
  }

  const registeredTools = tools
    .filter((tool) => tool.manifestExists && tool.appEntryExists)
    .sort((left, right) => left.directoryName.localeCompare(right.directoryName));

  validateToolRegistrations(registeredTools);
  return registeredTools;
}

async function readManifestId(manifestPath, fallback) {
  const source = await fs.readFile(manifestPath, "utf8");
  const match = source.match(/\bid:\s*["']([^"']+)["']/);

  return match?.[1] ?? fallback;
}

function validateToolRegistrations(tools) {
  const toolIds = new Set();
  const packageNames = new Set();

  for (const tool of tools) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(tool.toolId)) {
      throw new Error(`${tool.directoryName} has invalid manifest id "${tool.toolId}"`);
    }

    if (toolIds.has(tool.toolId)) {
      throw new Error(`duplicate tool manifest id "${tool.toolId}"`);
    }

    if (packageNames.has(tool.packageName)) {
      throw new Error(`duplicate tool package name "${tool.packageName}"`);
    }

    toolIds.add(tool.toolId);
    packageNames.add(tool.packageName);
  }
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
    (tool) => `  ${JSON.stringify(tool.toolId)}: () => import("${tool.packageName}/app")`
  );
  const source = `import type { ComponentType } from "react";

import type { ToolAppProps } from "../types";

export type ToolAppModule = {
  default: ComponentType<ToolAppProps>;
};

export type ToolAppLoader = () => Promise<ToolAppModule>;

export const toolAppLoaders = {
${loaderLines.join(",\n")}
} satisfies Record<string, ToolAppLoader>;

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
