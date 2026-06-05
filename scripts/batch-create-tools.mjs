import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const toolsDir = path.join(rootDir, "tools");

const tools = [
  // 开发工具
  { id: "api-route-designer", name: "API Route Designer", category: "developer-tools", tags: ["api", "rest", "routing", "design"], icon: "route", description: "可视化设计 REST/gRPC API 路由结构，生成 OpenAPI 规范片段。" },
  { id: "semver-calculator", name: "SemVer Calculator", category: "developer-tools", tags: ["semver", "version", "compare", "bump"], icon: "git-compare", description: "语义化版本号比较、递增、范围校验与排序。" },
  { id: "feature-flag-manager", name: "Feature Flag Manager", category: "developer-tools", tags: ["feature-flag", "toggle", "config"], icon: "toggle-left", description: "特性开关配置生成与策略模拟，支持多环境对比。" },
  { id: "code-complexity-analyzer", name: "Code Complexity Analyzer", category: "developer-tools", tags: ["complexity", "cyclomatic", "metrics"], icon: "bar-chart-3", description: "分析代码圈复杂度与认知复杂度，识别高复杂度函数。" },
  { id: "polyfill-finder", name: "Polyfill Finder", category: "developer-tools", tags: ["polyfill", "compatibility", "browser"], icon: " puzzle", description: "检查 JS/TS 代码中需要 polyfill 的 API，提供兼容性建议。" },

  // 文本工具
  { id: "text-replacer", name: "Text Replacer", category: "text-tools", tags: ["replace", "batch", "regex", "find"], icon: "find-replace", description: "批量查找替换文本，支持正则表达式、大小写转换与变量注入。" },
  { id: "word-counter-pro", name: "Word Counter Pro", category: "text-tools", tags: ["word-count", "reading-time", "frequency"], icon: "sigma", description: "字数统计、阅读时间估算、关键词频率分析与可读性评分。" },
  { id: "naming-convention-converter", name: "Naming Convention Converter", category: "text-tools", tags: ["camelCase", "snake_case", "kebab-case", "PascalCase"], icon: "case-sensitive", description: "多种命名风格互转：camelCase、snake_case、kebab-case、PascalCase 等。" },

  // 数据工具
  { id: "csv-markdown-table", name: "CSV ↔ Markdown Table", category: "data-tools", tags: ["csv", "markdown", "table", "convert"], icon: "table", description: "CSV 与 Markdown 表格互转，支持自定义分隔符和对齐方式。" },
  { id: "csv-json-converter", name: "CSV ↔ JSON Converter", category: "data-tools", tags: ["csv", "json", "convert", "transform"], icon: "file-spreadsheet", description: "CSV 与 JSON 互转，支持嵌套结构、自定义分隔符与编码检测。" },
  { id: "toml-formatter", name: "TOML Formatter", category: "data-tools", tags: ["toml", "formatter", "validator"], icon: "file-code", description: "TOML 格式校验、格式化与压缩，支持标准 TOML v1.0。" },
  { id: "data-schema-generator", name: "Data Schema Generator", category: "data-tools", tags: ["schema", "json-schema", "typescript", "inference"], icon: "drafting-compass", description: "从示例数据推断 JSON Schema、TypeScript 类型与 Zod 结构。" },
  { id: "excel-formula-builder", name: "Excel Formula Builder", category: "data-tools", tags: ["excel", "formula", "spreadsheet"], icon: "function-square", description: "可视化构建 Excel 公式，选择函数和参数并实时预览计算结果。" },
  { id: "parquet-schema-viewer", name: "Parquet Schema Viewer", category: "data-tools", tags: ["parquet", "schema", "columnar", "metadata"], icon: "columns", description: "可视化浏览 Parquet 文件的 schema、列类型与元数据统计。" },

  // 网络安全
  { id: "csp-evaluator", name: "CSP Evaluator", category: "security-tools", tags: ["csp", "content-security-policy", "security", "headers"], icon: "shield-alert", description: "输入 Content-Security-Policy 策略，分析安全风险与潜在绕过路径。" },
  { id: "saml-decoder", name: "SAML Decoder", category: "security-tools", tags: ["saml", "sso", "authentication", "xml"], icon: "fingerprint", description: "解码并解析 SAML Request/Response，提取断言、属性与签名信息。" },
  { id: "api-key-generator", name: "API Key Generator", category: "security-tools", tags: ["api-key", "generator", "token", "auth"], icon: "key-round", description: "生成多种格式的 API 密钥，支持自定义前缀、熵值与哈希后缀。" },
  { id: "rsa-key-pair-generator", name: "RSA Key Pair Generator", category: "security-tools", tags: ["rsa", "key-pair", "public-key", "private-key"], icon: "key", description: "生成 RSA 密钥对，支持 2048/3072/4096 位，输出 PEM 格式。" },
  { id: "ssh-key-inspector", name: "SSH Key Inspector", category: "security-tools", tags: ["ssh", "key", "fingerprint", "public-key"], icon: "terminal", description: "解析 SSH 公钥信息：算法、指纹、注释与位长。" },

  // 运维工具
  { id: "k8s-namespace-designer", name: "K8s Namespace Designer", category: "ops-tools", tags: ["kubernetes", "namespace", "resource-quota", "limit-range"], icon: "container", description: "可视化设计 Kubernetes Namespace 资源配额与 LimitRange。" },
  { id: "k8s-pod-troubleshooter", name: "K8s Pod Troubleshooter", category: "ops-tools", tags: ["kubernetes", "pod", "troubleshoot", "diagnosis"], icon: "bug", description: "Kubernetes Pod 故障排查引导，交互式诊断 CrashLoopBackOff 等常见问题。" },
  { id: "nginx-config-generator", name: "Nginx Config Generator", category: "ops-tools", tags: ["nginx", "config", "reverse-proxy", "load-balancer"], icon: "server", description: "Nginx 配置生成器，支持反向代理、负载均衡与 SSL 终端。" },
  { id: "shell-formatter", name: "Shell Formatter", category: "ops-tools", tags: ["shell", "bash", "formatter", "shfmt"], icon: "terminal-square", description: "Shell 脚本格式化与 lint，支持 bash/sh/zsh 风格。" },

  // AI 工具
  { id: "prompt-template-builder", name: "Prompt Template Builder", category: "ai-tools", tags: ["prompt", "template", "ai", "llm"], icon: "message-square-plus", description: "AI Prompt 模板管理，支持变量注入、版本对比与输出预览。" },
  { id: "ai-model-benchmark", name: "AI Model Benchmark", category: "ai-tools", tags: ["ai", "benchmark", "model", "comparison"], icon: "gauge", description: "多模型输出对比：同一 Prompt 在不同 AI 模型下的响应并列展示。" },
  { id: "token-counter", name: "Token Counter", category: "ai-tools", tags: ["token", "counter", "claude", "gpt", "gemini"], icon: "calculator", description: "多模型 Token 计数与费用估算，支持 GPT/Claude/Gemini 分词模拟。" },
  { id: "ai-response-comparator", name: "AI Response Comparator", category: "ai-tools", tags: ["ai", "comparison", "response", "diff"], icon: "columns", description: "并排对比多个 AI 响应结果，高亮差异并评分质量。" },

  // 设计工具
  { id: "wcag-contrast-checker", name: "WCAG Contrast Checker", category: "design-tools", tags: ["wcag", "contrast", "accessibility", "a11y"], icon: "eye", description: "WCAG 2.2 AA/AAA 色彩对比度检查器，支持取色器与实时预览。" },
  { id: "design-token-generator", name: "Design Token Generator", category: "design-tools", tags: ["design-token", "css", "variables", "design-system"], icon: "palette", description: "从 CSS/JSON 提取设计 Token，生成颜色、间距、阴影等统一规范。" },
  { id: "icon-resizer", name: "Icon Resizer", category: "design-tools", tags: ["icon", "resize", "svg", "export"], icon: "crop", description: "图标批量调整大小与导出，支持 SVG/PNG 多分辨率输出。" },

  // 图片工具
  { id: "image-compressor", name: "Image Compressor", category: "image-tools", tags: ["image", "compress", "optimize", "webp"], icon: "image-down", description: "图片压缩与优化，调整质量/尺寸/格式，支持批量处理。" },
  { id: "color-palette-extractor", name: "Color Palette Extractor", category: "image-tools", tags: ["color", "palette", "extract", "image"], icon: "palette", description: "从上传图片提取主色调与配色方案，输出 HEX/HSL/RGB。" },
  { id: "exif-data-viewer", name: "EXIF Data Viewer", category: "image-tools", tags: ["exif", "metadata", "image", "camera"], icon: "info", description: "查看图片 EXIF 元数据：相机型号、GPS、拍摄参数等。" },
  { id: "image-cropper", name: "Image Cropper", category: "image-tools", tags: ["image", "crop", "resize", "aspect-ratio"], icon: "crop", description: "可视化图片裁剪，支持自由裁剪与预设尺寸比例。" },

  // 办公工具
  { id: "resume-builder", name: "Resume Builder", category: "office-tools", tags: ["resume", "cv", "template", "export"], icon: "file-text", description: "简历模板编辑器，支持 Markdown 编辑与结构化预览。" },

  // 效率工具
  { id: "habit-tracker", name: "Habit Tracker", category: "productivity-tools", tags: ["habit", "tracker", "streak", "productivity"], icon: "calendar-check", description: "习惯追踪器，记录每日打卡、连续天数与完成率统计。" },
  { id: "daily-standup-generator", name: "Daily Standup Generator", category: "productivity-tools", tags: ["standup", "daily", "scrum", "agile"], icon: "message-circle", description: "生成每日站会更新模板，基于 Git 提交记录自动生成。" },

  // 社媒工具
  { id: "hashtag-generator", name: "Hashtag Generator", category: "social-tools", tags: ["hashtag", "social-media", "content"], icon: "hash", description: "基于内容描述智能推荐社交媒体标签，支持分类与热门标签。" },

  // 电商工具
  { id: "shipping-cost-calculator", name: "Shipping Cost Calculator", category: "ecommerce-tools", tags: ["shipping", "cost", "logistics", "ecommerce"], icon: "truck", description: "运费估算器，支持多种物流方式、重量区间与目的地。" },

  // 学习工具
  { id: "anki-card-exporter", name: "Anki Card Exporter", category: "learning-tools", tags: ["anki", "flashcard", "spaced-repetition"], icon: "notebook", description: "生成 Anki 导入用的 APKG 卡片包，支持 Markdown 转卡片。" },
  { id: "quiz-generator", name: "Quiz Generator", category: "learning-tools", tags: ["quiz", "exam", "question", "test"], icon: "help-circle", description: "基于输入内容自动生成选择题/填空题/问答题。" },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const tool of tools) {
    const toolDir = path.join(toolsDir, tool.id);
    try {
      await fs.access(toolDir);
      console.log(`  SKIP ${tool.id} (already exists)`);
      skipped++;
      continue;
    } catch { /* doesn't exist, proceed */ }

    const manifest = `import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "${tool.id}",
  name: "${tool.name}",
  description: "${tool.description}",
  category: "${tool.category}",
  tags: [${tool.tags.map(t => `"${t}"`).join(", ")}],
  icon: "${tool.icon}",
  runtime: "simple",
  featured: false
};

export default manifest;
`;

    const component = `"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function ${tool.id.split("-").map(s => s[0].toUpperCase() + s.slice(1)).join("")}Tool({ manifest }: ToolAppProps) {
  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <p className="eyebrow">Workspace</p>
        <h2>{manifest.name}</h2>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-panel__content">
        <p>在这里补充 ${tool.name} 的输入、处理和输出区域。</p>
      </div>
    </section>
  );
}
`;

    const packageJson = {
      name: `@tool-platform/${tool.id}`,
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
        "react": "^19.0.0"
      }
    };

    const readme = `# ${tool.name}

${tool.description}

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | ${tool.category} |
| 运行环境 | simple |

## 目录结构

\`\`\`
${tool.id}/
├── manifest.ts        # 工具元声明
├── app.tsx             # 工具 UI 组件
├── package.json        # 包配置
└── README.md           # 本文档
\`\`\`

## 开发指引

1. 确保已安装依赖：\`pnpm install\`
2. 修改 \`app.tsx\` 实现工具功能
3. 运行 \`pnpm generate:tools\` 重新生成工具注册表
4. 启动开发服务器：\`pnpm dev\`

## 构建与发布

\`\`\`bash
pnpm build        # 构建所有包
pnpm lint         # 代码检查
pnpm test         # 运行测试
\`\`\`
`;

    await fs.mkdir(toolDir, { recursive: true });
    await fs.writeFile(path.join(toolDir, "package.json"), JSON.stringify(packageJson, null, 2) + "\n", "utf8");
    await fs.writeFile(path.join(toolDir, "manifest.ts"), manifest, "utf8");
    await fs.writeFile(path.join(toolDir, "app.tsx"), component, "utf8");
    await fs.writeFile(path.join(toolDir, "README.md"), readme, "utf8");
    console.log(`  CREATE ${tool.id}`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
