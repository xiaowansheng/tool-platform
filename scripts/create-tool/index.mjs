import { promises as fs } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const toolsDir = path.join(rootDir, "tools");
const categoryOptions = [
  { id: "ai-tools", label: "AI Tools" },
  { id: "developer-tools", label: "Developer Tools" },
  { id: "ops-tools", label: "Ops Tools" },
  { id: "security-tools", label: "Security Tools" },
  { id: "file-tools", label: "File Tools" },
  { id: "image-tools", label: "Image Tools" },
  { id: "media-tools", label: "Media Tools" },
  { id: "text-tools", label: "Text Tools" },
  { id: "data-tools", label: "Data Tools" },
  { id: "office-tools", label: "Office Tools" },
  { id: "design-tools", label: "Design Tools" },
  { id: "seo-tools", label: "SEO Tools" },
  { id: "webmaster-tools", label: "Webmaster Tools" },
  { id: "learning-tools", label: "Learning Tools" },
  { id: "calculator-tools", label: "Calculator Tools" },
  { id: "social-tools", label: "Social Tools" },
  { id: "ecommerce-tools", label: "Ecommerce Tools" },
  { id: "productivity-tools", label: "Productivity Tools" },
  { id: "entertainment-tools", label: "Entertainment Tools" },
  { id: "discovery-tools", label: "Discovery Tools" }
];
const allowedCategories = categoryOptions.map((category) => category.id);
const allowedRuntimes = ["simple", "worker", "wasm", "ai", "sandbox", "remote", "realtime"];
const codeFence = String.fromCharCode(96, 96, 96);

function toTitleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function toPascalCase(value) {
  return toTitleCase(value).replace(/\s+/g, "");
}

function toComponentName(value) {
  const pascalCase = toPascalCase(value);
  return /^[A-Za-z]/.test(pascalCase) ? pascalCase + "Tool" : "Tool" + pascalCase + "Tool";
}

function normalizeId(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatNumberedOptions(choices) {
  return choices.map((choice, index) => "  " + (index + 1) + ". " + choice).join("\n");
}

function formatCategoryOptions() {
  return categoryOptions
    .map((choice, index) => "  " + (index + 1) + ". " + choice.id + " (" + choice.label + ")")
    .join("\n");
}

function resolveChoice(value, choices) {
  const trimmedValue = value.trim();
  const selectedIndex = Number(trimmedValue);

  if (Number.isInteger(selectedIndex) && selectedIndex >= 1 && selectedIndex <= choices.length) {
    return choices[selectedIndex - 1];
  }

  return trimmedValue;
}

function resolveCategory(value) {
  const trimmedValue = value.trim();
  const selectedIndex = Number(trimmedValue);

  if (Number.isInteger(selectedIndex) && selectedIndex >= 1 && selectedIndex <= categoryOptions.length) {
    return categoryOptions[selectedIndex - 1].id;
  }

  return trimmedValue;
}

async function promptForChoice(rl, label, choices) {
  const answer = await rl.question(label + ":\n" + formatNumberedOptions(choices) + "\nselect " + label + " by number or value: ");
  return resolveChoice(answer, choices);
}

async function promptForCategory(rl) {
  const answer = await rl.question(
    "category:\n" + formatCategoryOptions() + "\nselect category by number or category id: "
  );
  return resolveCategory(answer);
}

async function promptForMissingOptions(options) {
  const resolvedRuntime = options.runtime ? resolveChoice(options.runtime, allowedRuntimes) : "";
  const resolvedCategory = options.category ? resolveCategory(options.category) : "";
  const needsPrompt =
    !options.id ||
    !options.name ||
    !resolvedCategory ||
    !resolvedRuntime ||
    (resolvedRuntime === "remote" && !options.remoteUrl);

  if (!needsPrompt) {
    return {
      ...options,
      category: resolvedCategory,
      runtime: resolvedRuntime
    };
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const id = options.id || normalizeId(await rl.question("tool id: "));
    const name = options.name || (await rl.question("display name: "));
    const category = resolvedCategory || (await promptForCategory(rl));
    const runtime = resolvedRuntime || (await promptForChoice(rl, "runtime", allowedRuntimes));
    const remoteUrl = runtime === "remote" ? options.remoteUrl || (await rl.question("remote iframe URL: ")) : "";

    return {
      ...options,
      id,
      name,
      category,
      runtime,
      remoteUrl
    };
  } finally {
    rl.close();
  }
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    id: args.shift() ?? "",
    name: "",
    category: "",
    runtime: "",
    remoteUrl: ""
  };

  while (args.length > 0) {
    const flag = args.shift();
    const value = args.shift() ?? "";

    if (flag === "--name") {
      options.name = value;
    }

    if (flag === "--category") {
      options.category = value;
    }

    if (flag === "--runtime") {
      options.runtime = value;
    }

    if (flag === "--remote-url") {
      options.remoteUrl = value;
    }
  }

  return options;
}

function quoted(value) {
  return JSON.stringify(value);
}

function validateRemoteUrl(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error("remote runtime requires --remote-url");
  }

  if (trimmedValue.startsWith("/")) {
    return;
  }

  try {
    const remoteUrl = new URL(trimmedValue);

    if (remoteUrl.protocol === "http:" || remoteUrl.protocol === "https:") {
      return;
    }
  } catch {
    // Fall through to the explicit error below.
  }

  throw new Error("remote URL must be an absolute http(s) URL or a root-relative path");
}

async function ensureToolDoesNotExist(toolDir) {
  try {
    await fs.access(toolDir);
    throw new Error("tool already exists: " + toolDir);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }
}

function buildLocalManifest(toolId, name, category, runtime) {
  return [
    "import type { ToolManifest } from \"@tool-platform/tool-contracts\";",
    "",
    "const manifest: ToolManifest = {",
    "  id: " + quoted(toolId) + ",",
    "  name: " + quoted(name) + ",",
    "  description: " + quoted(name + " workspace") + ",",
    "  category: " + quoted(category) + ",",
    "  tags: [" + quoted(toolId) + "],",
    "  icon: \"sparkles\",",
    "  runtime: " + quoted(runtime) + ",",
    "  featured: false",
    "};",
    "",
    "export default manifest;",
    ""
  ].join("\n");
}

function buildRemoteManifest(toolId, name, category, remoteUrl) {
  return [
    "import type { ToolManifest } from \"@tool-platform/tool-contracts\";",
    "",
    "const manifest: ToolManifest = {",
    "  id: " + quoted(toolId) + ",",
    "  name: " + quoted(name) + ",",
    "  description: " + quoted(name + " remote iframe workspace") + ",",
    "  category: " + quoted(category) + ",",
    "  tags: [" + quoted(toolId) + ", \"remote\", \"iframe\"],",
    "  icon: \"panel-top\",",
    "  runtime: \"remote\",",
    "  featured: false,",
    "  isolation: \"iframe\",",
    "  sandbox: true,",
    "  permissions: [],",
    "  capabilities: [\"remote-iframe\"],",
    "  microFrontend: {",
    "    kind: \"iframe\",",
    "    url: " + quoted(remoteUrl) + ",",
    "    title: " + quoted(name),
    "  }",
    "};",
    "",
    "export default manifest;",
    ""
  ].join("\n");
}

function buildLocalComponent(toolId, name) {
  return [
    "\"use client\";",
    "",
    "import type { ToolAppProps } from \"@tool-platform/tool-contracts\";",
    "",
    "export default function " + toComponentName(toolId) + "({ manifest }: ToolAppProps) {",
    "  return (",
    "    <section className=\"tool-panel\">",
    "      <div className=\"tool-panel__header\">",
    "        <p className=\"eyebrow\">Workspace</p>",
    "        <h2>{manifest.name}</h2>",
    "        <p>{manifest.description}</p>",
    "      </div>",
    "      <div className=\"tool-panel__content\">",
    "        <p>Add the input, processing, and output UI for " + name + " here.</p>",
    "      </div>",
    "    </section>",
    "  );",
    "}",
    ""
  ].join("\n");
}

function buildLocalPackageJson(toolId) {
  return {
    name: "@tool-platform/" + toolId,
    version: "0.1.0",
    private: true,
    type: "module",
    exports: {
      "./manifest": "./manifest.ts",
      "./app": "./app.tsx"
    },
    dependencies: {
      "@tool-platform/tool-contracts": "workspace:*"
    },
    peerDependencies: {
      react: "^19.0.0"
    }
  };
}

function buildRemotePackageJson(toolId) {
  return {
    name: "@tool-platform/" + toolId,
    version: "0.1.0",
    private: true,
    type: "module",
    exports: {
      "./manifest": "./manifest.ts"
    },
    dependencies: {
      "@tool-platform/tool-contracts": "workspace:*"
    }
  };
}

function buildLocalReadme(toolId, name, category, runtime) {
  return [
    "# " + name,
    "",
    name + " workspace.",
    "",
    "## Metadata",
    "",
    "| Field | Value |",
    "| --- | --- |",
    "| Category | " + category + " |",
    "| Runtime | " + runtime + " |",
    "",
    "## Directory",
    "",
    codeFence,
    toolId + "/",
    "|-- manifest.ts",
    "|-- app.tsx",
    "|-- package.json",
    "\\-- README.md",
    codeFence,
    "",
    "## Development",
    "",
    "1. Implement the tool UI in app.tsx.",
    "2. Run pnpm generate:tools after changing the manifest or package exports.",
    "3. Start pnpm dev and open /tools/" + toolId + ".",
    ""
  ].join("\n");
}

function buildRemoteReadme(toolId, name, category, remoteUrl) {
  return [
    "# " + name,
    "",
    name + " is registered as a remote iframe micro frontend.",
    "",
    "## Metadata",
    "",
    "| Field | Value |",
    "| --- | --- |",
    "| Category | " + category + " |",
    "| Runtime | remote |",
    "| URL | " + remoteUrl + " |",
    "",
    "## Directory",
    "",
    codeFence,
    toolId + "/",
    "|-- manifest.ts",
    "|-- package.json",
    "\\-- README.md",
    codeFence,
    "",
    "Remote tools are manifest-only packages. The platform renders their micro frontend through ToolMicroFrontendHost and does not generate a local app loader.",
    ""
  ].join("\n");
}

async function writeLocalFiles(toolDir, toolId, name, category, runtime) {
  await fs.mkdir(toolDir, { recursive: true });
  await fs.writeFile(
    path.join(toolDir, "package.json"),
    JSON.stringify(buildLocalPackageJson(toolId), null, 2) + "\n",
    "utf8"
  );
  await fs.writeFile(path.join(toolDir, "manifest.ts"), buildLocalManifest(toolId, name, category, runtime), "utf8");
  await fs.writeFile(path.join(toolDir, "app.tsx"), buildLocalComponent(toolId, name), "utf8");
  await fs.writeFile(path.join(toolDir, "README.md"), buildLocalReadme(toolId, name, category, runtime), "utf8");
}

async function writeRemoteFiles(toolDir, toolId, name, category, remoteUrl) {
  await fs.mkdir(toolDir, { recursive: true });
  await fs.writeFile(
    path.join(toolDir, "package.json"),
    JSON.stringify(buildRemotePackageJson(toolId), null, 2) + "\n",
    "utf8"
  );
  await fs.writeFile(path.join(toolDir, "manifest.ts"), buildRemoteManifest(toolId, name, category, remoteUrl), "utf8");
  await fs.writeFile(path.join(toolDir, "README.md"), buildRemoteReadme(toolId, name, category, remoteUrl), "utf8");
}

async function main() {
  const initialOptions = parseArgs(process.argv.slice(2));
  const options = await promptForMissingOptions(initialOptions);
  const toolId = normalizeId(options.id);

  if (!toolId) {
    throw new Error("tool id is required");
  }

  if (!allowedCategories.includes(options.category)) {
    throw new Error("category must be one of: " + allowedCategories.join(", "));
  }

  if (!allowedRuntimes.includes(options.runtime)) {
    throw new Error("runtime must be one of: " + allowedRuntimes.join(", "));
  }

  if (options.runtime === "remote") {
    validateRemoteUrl(options.remoteUrl);
  }

  const toolDir = path.join(toolsDir, toolId);
  await ensureToolDoesNotExist(toolDir);

  if (options.runtime === "remote") {
    await writeRemoteFiles(toolDir, toolId, options.name || toTitleCase(toolId), options.category, options.remoteUrl);
  } else {
    await writeLocalFiles(toolDir, toolId, options.name || toTitleCase(toolId), options.category, options.runtime);
  }

  console.log("created tool: " + toolId);
  console.log("next: pnpm generate:tools");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
