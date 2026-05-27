import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const toolsDir = path.join(rootDir, "tools");
const toolSdkDir = path.join(rootDir, "packages", "tool-sdk");
const generatedRegistryPath = path.join(toolSdkDir, "src", "generated", "registry.ts");
const toolSdkPackagePath = path.join(toolSdkDir, "package.json");

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

      return {
        directoryName: path.basename(toolDir),
        packageName: packageJson.name,
        manifestExists: await fileExists(manifestPath),
        componentExists: await fileExists(toolComponentPath)
      };
    })
  );

  return tools
    .filter((tool) => tool.manifestExists && tool.componentExists)
    .sort((left, right) => left.directoryName.localeCompare(right.directoryName));
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function writeRegistry(tools) {
  const importLines = [];
  const recordLines = [];

  for (const tool of tools) {
    const symbol = pascalCase(tool.directoryName);
    importLines.push(`import ${symbol}Tool from "${tool.packageName}/tool";`);
    importLines.push(`import ${symbol}Manifest from "${tool.packageName}/manifest";`);
    recordLines.push(
      `  {\n    manifest: ${symbol}Manifest,\n    component: ${symbol}Tool\n  }`
    );
  }

  const source = `${importLines.join("\n")}

import type { ToolRecord } from "../types";

export const toolRecords: ToolRecord[] = [
${recordLines.join(",\n")}
];
`;

  await fs.writeFile(generatedRegistryPath, source, "utf8");
}

async function syncToolSdkDependencies(tools) {
  const packageJson = JSON.parse(await fs.readFile(toolSdkPackagePath, "utf8"));
  const nextDependencies = { ...(packageJson.dependencies ?? {}) };

  for (const dependencyName of Object.keys(nextDependencies)) {
    if (
      dependencyName.startsWith("@tool-platform/") &&
      dependencyName !== "@tool-platform/tool-sdk" &&
      dependencyName !== "@tool-platform/tool-contracts"
    ) {
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

  await writeRegistry(tools);
  await syncToolSdkDependencies(tools);

  console.log(`generated ${tools.length} tool registrations`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
