import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const toolsDir = path.join(rootDir, "tools");

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
  realtime: "实时通信"
};

function extractManifestFields(source) {
  const fields = {};

  const idMatch = source.match(/\bid:\s*["']([^"']+)["']/);
  if (idMatch) fields.id = idMatch[1];

  const nameMatch = source.match(/\bname:\s*["']([^"']+)["']/);
  if (nameMatch) fields.name = nameMatch[1];

  const descMatch = source.match(/\bdescription:\s*["']([^"']+)["']/);
  if (descMatch) fields.description = descMatch[1];

  const categoryMatch = source.match(/\bcategory:\s*["']([^"']+)["']/);
  if (categoryMatch) fields.category = categoryMatch[1];

  const runtimeMatch = source.match(/\bruntime:\s*["']([^"']+)["']/);
  if (runtimeMatch) fields.runtime = runtimeMatch[1];

  const tagsMatch = source.match(/\btags:\s*\[([^\]]*)\]/);
  if (tagsMatch) {
    fields.tags = tagsMatch[1]
      .split(",")
      .map(t => t.trim().replace(/["']/g, ""))
      .filter(Boolean);
  }

  const permissionsMatch = source.match(/\bpermissions:\s*\[([^\]]*)\]/);
  if (permissionsMatch) {
    fields.permissions = permissionsMatch[1]
      .split(",")
      .map(p => p.trim().replace(/["']/g, ""))
      .filter(Boolean);
  }

  const capabilitiesMatch = source.match(/\bcapabilities:\s*\[([^\]]*)\]/);
  if (capabilitiesMatch) {
    fields.capabilities = capabilitiesMatch[1]
      .split(",")
      .map(c => c.trim().replace(/["']/g, ""))
      .filter(Boolean);
  }

  return fields;
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

  const lines = [
    `# ${name}`,
    "",
    description,
    "",
    "## 概述",
    "",
    `| 属性 | 值 |`,
    `|------|-----|`,
    `| 分类 | ${categoryLabel} |`,
    `| 运行环境 | ${runtimeLabel} |`,
  ];

  if (tags.length > 0) {
    lines.push(`| 标签 | ${tags.join("、")} |`);
  }

  if (permissions.length > 0) {
    lines.push(`| 权限 | ${permissions.join("、")} |`);
  }

  if (capabilities.length > 0) {
    lines.push(`| 能力 | ${capabilities.join("、")} |`);
  }

  lines.push(
    "",
    "## 目录结构",
    "",
    "```",
    `${fields.id || "tool-name"}/`,
    "├── manifest.ts        # 工具元声明",
    "├── ToolClient.tsx     # 工具 UI 组件",
    "├── package.json      # 包配置",
    "└── README.md         # 本文档",
    "```",
    "",
    "## 开发指引",
    "",
    "1. 确保已安装依赖：\`pnpm install\`",
    `2. 修改 \`ToolClient.tsx\` 实现工具功能`,
    `3. 运行 \`pnpm generate:tools\` 重新生成工具注册表`,
    "4. 启动开发服务器：\`pnpm dev\`",
    "",
    "## 构建与发布",
    "",
    "```bash",
    "pnpm build        # 构建所有包",
    "pnpm lint         # 代码检查",
    "pnpm test         # 运行测试",
    "```",
    ""
  );

  return lines.join("\n");
}

async function main() {
  const manifestFiles = await fg("*/manifest.ts", {
    cwd: toolsDir,
    absolute: true
  });

  console.log(`found ${manifestFiles.length} tool manifests`);

  let generated = 0;
  let skipped = 0;

  for (const manifestPath of manifestFiles) {
    const toolDir = path.dirname(manifestPath);
    const readmePath = path.join(toolDir, "README.md");
    const source = await fs.readFile(manifestPath, "utf8");
    const fields = extractManifestFields(source);

    if (!fields.name) {
      console.warn(`  skip (no name): ${manifestPath}`);
      skipped++;
      continue;
    }

    const readme = generateReadme(fields);
    await fs.writeFile(readmePath, readme, "utf8");
    generated++;
  }

  console.log(`generated: ${generated}, skipped: ${skipped}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
