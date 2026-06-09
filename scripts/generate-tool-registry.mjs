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
const allowedToolCategories = new Set([
  "ai-tools",
  "developer-tools",
  "ops-tools",
  "security-tools",
  "file-tools",
  "image-tools",
  "media-tools",
  "text-tools",
  "data-tools",
  "office-tools",
  "design-tools",
  "seo-tools",
  "webmaster-tools",
  "learning-tools",
  "calculator-tools",
  "social-tools",
  "ecommerce-tools",
  "productivity-tools",
  "entertainment-tools",
  "discovery-tools"
]);
const allowedToolRuntimes = new Set(["simple", "worker", "wasm", "ai", "sandbox", "remote", "realtime"]);

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

  const registeredTools = (await Promise.all(packageFiles.map(loadToolPackage))).sort((left, right) =>
    left.directoryName.localeCompare(right.directoryName)
  );

  validateToolRegistrations(registeredTools);
  return registeredTools;
}

async function loadToolPackage(packageFile) {
  const packageJson = JSON.parse(await fs.readFile(packageFile, "utf8"));
  const toolDir = path.dirname(packageFile);
  const manifestPath = path.join(toolDir, "manifest.ts");
  const appEntryPath = path.join(toolDir, "app.tsx");
  const directoryName = path.basename(toolDir);

  if (typeof packageJson.name !== "string" || !packageJson.name) {
    throw new Error(directoryName + "/package.json must define a package name");
  }

  if (!(await fileExists(manifestPath))) {
    throw new Error(directoryName + " must define manifest.ts");
  }

  const manifest = await readManifestMetadata(manifestPath, directoryName);
  const appEntryExists = await fileExists(appEntryPath);
  const isIframeMicroFrontend = manifest.microFrontendKind === "iframe";

  validateToolPackageShape({
    appEntryExists,
    directoryName,
    exportsMap: packageJson.exports,
    isIframeMicroFrontend,
    runtime: manifest.runtime
  });

  return {
    directoryName,
    packageName: packageJson.name,
    toolId: manifest.toolId,
    hasLocalApp: !isIframeMicroFrontend
  };
}

async function readManifestMetadata(manifestPath, fallback) {
  const source = await fs.readFile(manifestPath, "utf8");
  const toolId = readStringProperty(source, "id") || fallback;
  const category = readStringProperty(source, "category");
  const runtime = readStringProperty(source, "runtime");

  if (!category) {
    throw new Error(fallback + "/manifest.ts must define category");
  }

  if (!allowedToolCategories.has(category)) {
    throw new Error(fallback + "/manifest.ts has unsupported category " + JSON.stringify(category));
  }

  if (!runtime) {
    throw new Error(fallback + "/manifest.ts must define runtime");
  }

  if (!allowedToolRuntimes.has(runtime)) {
    throw new Error(fallback + "/manifest.ts has unsupported runtime " + JSON.stringify(runtime));
  }

  return {
    toolId,
    category,
    runtime,
    microFrontendKind: readMicroFrontendKind(source)
  };
}

function readStringProperty(source, propertyName) {
  const match = source.match(new RegExp("\\b" + propertyName + "\\s*:\\s*[\"']([^\"']+)[\"']"));
  return match?.[1] ?? "";
}

function readMicroFrontendKind(source) {
  const match = source.match(/\bmicroFrontend\s*:\s*\{[\s\S]*?\bkind\s*:\s*["']([^"']+)["']/);
  return match?.[1] ?? "";
}

function validateToolPackageShape({ appEntryExists, directoryName, exportsMap, isIframeMicroFrontend, runtime }) {
  if (typeof exportsMap !== "object" || exportsMap === null || !exportsMap["./manifest"]) {
    throw new Error(directoryName + "/package.json must export ./manifest");
  }

  if (isIframeMicroFrontend) {
    if (runtime !== "remote") {
      throw new Error(directoryName + "/manifest.ts uses iframe microFrontend and must set runtime: \"remote\"");
    }

    if (appEntryExists || exportsMap["./app"]) {
      throw new Error(directoryName + " is a remote iframe tool and must not define app.tsx or export ./app");
    }

    return;
  }

  if (runtime === "remote") {
    throw new Error(directoryName + "/manifest.ts sets runtime: \"remote\" and must define microFrontend.kind: \"iframe\"");
  }

  if (!appEntryExists) {
    throw new Error(directoryName + " must define app.tsx for a local tool");
  }

  if (!exportsMap["./app"]) {
    throw new Error(directoryName + "/package.json must export ./app for a local tool");
  }
}

function validateToolRegistrations(tools) {
  const toolIds = new Set();
  const packageNames = new Set();

  for (const tool of tools) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(tool.toolId)) {
      throw new Error(tool.directoryName + " has invalid manifest id \"" + tool.toolId + "\"");
    }

    if (toolIds.has(tool.toolId)) {
      throw new Error("duplicate tool manifest id \"" + tool.toolId + "\"");
    }

    if (packageNames.has(tool.packageName)) {
      throw new Error("duplicate tool package name \"" + tool.packageName + "\"");
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
    importLines.push("import " + symbol + "Manifest from \"" + tool.packageName + "/manifest\";");
    manifestLines.push("  " + symbol + "Manifest");
  }

  const source =
    importLines.join("\n") +
    "\n\n" +
    "import type { ToolManifest } from \"../types\";\n\n" +
    "export const toolManifests: ToolManifest[] = [\n" +
    manifestLines.join(",\n") +
    "\n];\n";

  await fs.writeFile(generatedManifestsPath, source, "utf8");
}

async function writeClientLoaders(tools) {
  const localTools = tools.filter((tool) => tool.hasLocalApp);
  const loaderLines = localTools.map(
    (tool) => "  " + JSON.stringify(tool.toolId) + ": () => import(\"" + tool.packageName + "/app\")"
  );
  const source = [
    "import type { ComponentType } from \"react\";",
    "",
    "import type { ToolAppProps } from \"../types\";",
    "",
    "export type ToolAppModule = {",
    "  default: ComponentType<ToolAppProps>;",
    "};",
    "",
    "export type ToolAppLoader = () => Promise<ToolAppModule>;",
    "",
    "export const toolAppLoaders = {",
    loaderLines.join(",\n"),
    "} satisfies Record<string, ToolAppLoader>;",
    ""
  ].join("\n");

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

  console.log(
    "generated " + tools.length + " tool registrations (" + tools.filter((tool) => tool.hasLocalApp).length + " local loaders)"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
