import { promises as fs } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const toolsDir = path.join(rootDir, "tools");
const allowedCategories = [
  "AI工具",
  "开发工具",
  "运维工具",
  "网络安全",
  "文件工具",
  "图片工具",
  "视频音频",
  "文本工具",
  "数据工具",
  "办公工具",
  "设计工具",
  "SEO工具",
  "站长工具",
  "学习工具",
  "计算工具",
  "社媒工具",
  "电商工具",
  "效率工具",
  "娱乐工具",
  "导航发现"
];
const allowedRuntimes = ["simple", "worker", "wasm", "ai", "sandbox", "realtime"];

function toTitleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function normalizeId(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function promptForMissingOptions(options) {
  if (options.id && options.name && options.category && options.runtime) {
    return options;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const id = options.id || normalizeId(await rl.question("tool id: "));
  const name = options.name || (await rl.question("display name: "));
  const category = options.category || (await rl.question(`category (${allowedCategories.join(", ")}): `));
  const runtime = options.runtime || (await rl.question(`runtime (${allowedRuntimes.join(", ")}): `));

  rl.close();

  return {
    ...options,
    id,
    name,
    category,
    runtime
  };
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    id: args.shift() ?? "",
    name: "",
    category: "",
    runtime: ""
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
  }

  return options;
}

async function ensureToolDoesNotExist(toolDir) {
  try {
    await fs.access(toolDir);
    throw new Error(`tool already exists: ${toolDir}`);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function writeFiles(toolDir, toolId, name, category, runtime) {
  const manifest = `import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "${toolId}",
  name: "${name}",
  description: "${name} workspace",
  category: "${category}",
  tags: ["${toolId}"],
  icon: "sparkles",
  runtime: "${runtime}",
  featured: false
};

export default manifest;
`;

  const component = `"use client";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

export default function ${toTitleCase(toolId).replace(/\s+/g, "")}Tool({ manifest }: ToolClientProps) {
  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <p className="eyebrow">Workspace</p>
        <h2>{manifest.name}</h2>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-panel__content">
        <p>在这里补充 ${name} 的输入、处理和输出区域。</p>
      </div>
    </section>
  );
}
`;

  const packageJson = {
    name: `@tool-platform/${toolId}`,
    version: "0.1.0",
    private: true,
    type: "module",
    exports: {
      "./manifest": "./manifest.ts",
      "./tool": "./ToolClient.tsx"
    },
    dependencies: {
      "@tool-platform/tool-contracts": "workspace:*"
    },
    peerDependencies: {
      react: "^19.0.0"
    }
  };

  const readme = `# ${name}

- category: ${category}
- runtime: ${runtime}

按照平台文档，这个目录应包含：

- \`manifest.ts\`
- \`ToolClient.tsx\`
- \`README.md\`
- 需要时再增加 worker / wasm / test
`;

  await fs.mkdir(toolDir, { recursive: true });
  await fs.writeFile(path.join(toolDir, "package.json"), JSON.stringify(packageJson, null, 2) + "\n", "utf8");
  await fs.writeFile(path.join(toolDir, "manifest.ts"), manifest, "utf8");
  await fs.writeFile(path.join(toolDir, "ToolClient.tsx"), component, "utf8");
  await fs.writeFile(path.join(toolDir, "README.md"), readme, "utf8");
}

async function main() {
  const initialOptions = parseArgs(process.argv.slice(2));
  const options = await promptForMissingOptions(initialOptions);
  const toolId = normalizeId(options.id);

  if (!toolId) {
    throw new Error("tool id is required");
  }

  if (!allowedCategories.includes(options.category)) {
    throw new Error(`category must be one of: ${allowedCategories.join(", ")}`);
  }

  if (!allowedRuntimes.includes(options.runtime)) {
    throw new Error(`runtime must be one of: ${allowedRuntimes.join(", ")}`);
  }

  const toolDir = path.join(toolsDir, toolId);
  await ensureToolDoesNotExist(toolDir);
  await writeFiles(toolDir, toolId, options.name || toTitleCase(toolId), options.category, options.runtime);

  console.log(`created tool: ${toolId}`);
  console.log("next: pnpm generate:tools");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
