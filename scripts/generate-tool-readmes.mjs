import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const toolsDir = path.join(rootDir, "tools");
const tick = String.fromCharCode(96);
const fence = String.fromCharCode(96, 96, 96);

const categoryLabels = {
  "ai-tools": "AI 工具",
  "developer-tools": "开发工具",
  "ops-tools": "运维工具",
  "security-tools": "网络安全",
  "file-tools": "文件工具",
  "image-tools": "图片工具",
  "media-tools": "视频音频",
  "text-tools": "文本工具",
  "data-tools": "数据工具",
  "office-tools": "办公工具",
  "design-tools": "设计工具",
  "seo-tools": "SEO 工具",
  "webmaster-tools": "站长工具",
  "learning-tools": "学习工具",
  "calculator-tools": "计算工具",
  "social-tools": "社媒工具",
  "ecommerce-tools": "电商工具",
  "productivity-tools": "效率工具",
  "entertainment-tools": "娱乐工具",
  "discovery-tools": "导航发现"
};

const runtimeLabels = {
  simple: "轻量（主线程）",
  worker: "Web Worker",
  wasm: "WebAssembly",
  ai: "AI 推理",
  sandbox: "沙箱隔离",
  remote: "远程 iframe 微前端",
  realtime: "实时通信"
};

function extractArrayField(source, fieldName) {
  const match = source.match(new RegExp("\\b" + fieldName + "\\s*:\\s*\\[([^\\]]*)\\]"));

  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((value) => value.trim().replace(/["']/g, ""))
    .filter(Boolean);
}

function extractStringField(source, fieldName) {
  const match = source.match(new RegExp("\\b" + fieldName + "\\s*:\\s*[\"']([^\"']+)[\"']"));
  return match?.[1] ?? "";
}

function extractMicroFrontendKind(source) {
  const match = source.match(/\bmicroFrontend\s*:\s*\{[\s\S]*?\bkind\s*:\s*["']([^"']+)["']/);
  return match?.[1] ?? "";
}

function extractMicroFrontendUrl(source) {
  const match = source.match(/\bmicroFrontend\s*:\s*\{[\s\S]*?\burl\s*:\s*["']([^"']+)["']/);
  return match?.[1] ?? "";
}

function extractManifestFields(source) {
  return {
    id: extractStringField(source, "id"),
    name: extractStringField(source, "name"),
    description: extractStringField(source, "description"),
    category: extractStringField(source, "category"),
    runtime: extractStringField(source, "runtime"),
    tags: extractArrayField(source, "tags"),
    permissions: extractArrayField(source, "permissions"),
    capabilities: extractArrayField(source, "capabilities"),
    microFrontendKind: extractMicroFrontendKind(source),
    microFrontendUrl: extractMicroFrontendUrl(source)
  };
}

function generateReadme(fields) {
  const name = fields.name || fields.id || "Unknown Tool";
  const description = fields.description || "";
  const category = fields.category || "";
  const categoryLabel = categoryLabels[category] || category;
  const runtime = fields.runtime || "simple";
  const runtimeLabel = runtimeLabels[runtime] || runtime;
  const tags = fields.tags || [];
  const permissions = fields.permissions || [];
  const capabilities = fields.capabilities || [];
  const isRemoteIframe = runtime === "remote" || fields.microFrontendKind === "iframe";

  const lines = [
    "# " + name,
    "",
    description,
    "",
    "## 概述",
    "",
    "| 属性 | 值 |",
    "|------|-----|",
    "| 分类 | " + categoryLabel + " (" + tick + category + tick + ") |",
    "| 运行环境 | " + runtimeLabel + " (" + tick + runtime + tick + ") |"
  ];

  if (fields.microFrontendUrl) {
    lines.push("| 远程入口 | " + fields.microFrontendUrl + " |");
  }

  if (tags.length > 0) {
    lines.push("| 标签 | " + tags.join("、") + " |");
  }

  if (permissions.length > 0) {
    lines.push("| 权限 | " + permissions.join("、") + " |");
  }

  if (capabilities.length > 0) {
    lines.push("| 能力 | " + capabilities.join("、") + " |");
  }

  lines.push("", "## 目录结构", "", fence, (fields.id || "tool-name") + "/", "├── manifest.ts        # 工具元声明");

  if (!isRemoteIframe) {
    lines.push("├── app.tsx            # 本地工具 UI 入口");
  }

  lines.push("├── package.json      # 包配置", "└── README.md         # 本文档", fence, "", "## 开发指引", "");

  if (isRemoteIframe) {
    lines.push(
      "1. 确保远程页面可通过 manifest 中的 " + tick + "microFrontend.url" + tick + " 访问。",
      "2. 远程 iframe 工具不包含 " + tick + "app.tsx" + tick + "，" + tick + "package.json" + tick + " 只导出 " + tick + "./manifest" + tick + "。",
      "3. 运行 " + tick + "pnpm generate:tools" + tick + " 重新生成工具注册表。",
      "4. 启动开发服务器：" + tick + "pnpm dev" + tick + "。"
    );
  } else {
    lines.push(
      "1. 确保已安装依赖：" + tick + "pnpm install" + tick + "。",
      "2. 修改 " + tick + "app.tsx" + tick + " 实现工具功能。",
      "3. 运行 " + tick + "pnpm generate:tools" + tick + " 重新生成工具注册表。",
      "4. 启动开发服务器：" + tick + "pnpm dev" + tick + "。"
    );
  }

  lines.push(
    "",
    "## 构建与发布",
    "",
    fence + "bash",
    "pnpm build        # 构建所有包",
    "pnpm lint         # 代码检查",
    "pnpm test         # 运行测试",
    fence,
    ""
  );

  return lines.join("\n");
}

async function main() {
  const manifestFiles = await fg("*/manifest.ts", {
    cwd: toolsDir,
    absolute: true
  });

  console.log("found " + manifestFiles.length + " tool manifests");

  let generated = 0;
  let skipped = 0;

  for (const manifestPath of manifestFiles) {
    const toolDir = path.dirname(manifestPath);
    const readmePath = path.join(toolDir, "README.md");
    const source = await fs.readFile(manifestPath, "utf8");
    const fields = extractManifestFields(source);

    if (!fields.name) {
      console.warn("  skip (no name): " + manifestPath);
      skipped++;
      continue;
    }

    const readme = generateReadme(fields);
    await fs.writeFile(readmePath, readme, "utf8");
    generated++;
  }

  console.log("generated: " + generated + ", skipped: " + skipped);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
