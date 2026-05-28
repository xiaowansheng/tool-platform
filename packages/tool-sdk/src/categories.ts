import type { CategoryMeta, ToolCategory } from "@tool-platform/tool-contracts";

export const categories: CategoryMeta[] = [
  {
    id: "ai-tools",
    label: "AI Tools",
    description: "LLM, prompt, RAG, agent, AI safety, evaluation, and model cost tools.",
    icon: "AI",
    keywords: ["ai", "llm", "prompt", "rag", "agent", "eval", "token", "AI工具", "模型", "智能体"]
  },
  {
    id: "developer-tools",
    label: "Developer Tools",
    description: "APIs, code, Git, type generation, debugging, build, and developer workflow tools.",
    icon: "</>",
    keywords: ["dev", "developer", "api", "git", "code", "debug", "typescript", "开发", "调试"]
  },
  {
    id: "ops-tools",
    label: "Ops Tools",
    description: "Linux, Docker, Kubernetes, cloud native, logs, monitoring, SLO, and incident tools.",
    icon: "OPS",
    keywords: ["ops", "linux", "docker", "kubernetes", "k8s", "terraform", "prometheus", "log", "运维"]
  },
  {
    id: "security-tools",
    label: "Security Tools",
    description: "Security scanning, secrets, supply chain, CVSS, CSP, PII, certificates, and risk checks.",
    icon: "SEC",
    keywords: ["security", "secrets", "cvss", "sbom", "csp", "pii", "tls", "安全", "网络安全"]
  },
  {
    id: "file-tools",
    label: "File Tools",
    description: "File structures, archives, checksums, metadata, batch files, and document conversion.",
    icon: "FILE",
    keywords: ["file", "archive", "checksum", "metadata", "pdf", "文件", "归档"]
  },
  {
    id: "image-tools",
    label: "Image Tools",
    description: "Image compression, EXIF, QR codes, icon assets, OCR, and visual input preprocessing.",
    icon: "IMG",
    keywords: ["image", "ocr", "exif", "qr", "barcode", "favicon", "图片", "图像"]
  },
  {
    id: "media-tools",
    label: "Media Tools",
    description: "Audio and video editing, media devices, media assets, and multimedia debugging.",
    icon: "AV",
    keywords: ["video", "audio", "media", "ffmpeg", "camera", "microphone", "视频", "音频"]
  },
  {
    id: "text-tools",
    label: "Text Tools",
    description: "Text encoding, conversion, inspection, diffing, Markdown, regex, and bulk text handling.",
    icon: "TXT",
    keywords: ["text", "markdown", "regex", "diff", "base64", "unicode", "encode", "decode", "文本", "编码"]
  },
  {
    id: "data-tools",
    label: "Data Tools",
    description: "JSON, CSV, YAML, SQL, Schema, Parquet, mock data, and structured data processing.",
    icon: "DATA",
    keywords: ["data", "json", "csv", "yaml", "sql", "database", "schema", "数据"]
  },
  {
    id: "office-tools",
    label: "Office Tools",
    description: "README, ADR, release notes, reports, PDF, tables, and office document generation.",
    icon: "DOC",
    keywords: ["office", "docs", "readme", "adr", "release", "pdf", "办公", "文档"]
  },
  {
    id: "design-tools",
    label: "Design Tools",
    description: "Color, typography, layout, shadow, gradient, motion, and UI visual debugging.",
    icon: "UI",
    keywords: ["design", "css", "color", "layout", "typography", "gradient", "设计"]
  },
  {
    id: "seo-tools",
    label: "SEO Tools",
    description: "Meta tags, Open Graph, robots.txt, slugs, UTM, and search presentation optimization.",
    icon: "SEO",
    keywords: ["seo", "meta", "open graph", "robots", "slug", "utm", "站点优化"]
  },
  {
    id: "webmaster-tools",
    label: "Webmaster Tools",
    description: "DNS, HTTP, ports, CIDR, headers, cookies, HAR, and website diagnostics.",
    icon: "WEB",
    keywords: ["webmaster", "dns", "http", "header", "cookie", "har", "cidr", "站长"]
  },
  {
    id: "learning-tools",
    label: "Learning Tools",
    description: "Study planning, examples, knowledge checks, fact-checking, and practice material prep.",
    icon: "EDU",
    keywords: ["learn", "study", "example", "checklist", "practice", "学习"]
  },
  {
    id: "calculator-tools",
    label: "Calculator Tools",
    description: "Percentages, units, ratios, bases, time, costs, and resource conversion calculators.",
    icon: "123",
    keywords: ["calculator", "unit", "convert", "ratio", "time", "cost", "计算", "换算"]
  },
  {
    id: "social-tools",
    label: "Social Tools",
    description: "Social previews, link parameters, image cards, captions, and platform assets.",
    icon: "SOC",
    keywords: ["social", "share", "open graph", "utm", "card", "社媒"]
  },
  {
    id: "ecommerce-tools",
    label: "Ecommerce Tools",
    description: "Ecommerce copy, product data, conversion tracking, privacy compliance, and operations.",
    icon: "EC",
    keywords: ["ecommerce", "shop", "product", "conversion", "cookie", "电商"]
  },
  {
    id: "productivity-tools",
    label: "Productivity Tools",
    description: "Productivity, automation, notification testing, checklist generation, and workflow helpers.",
    icon: "FAST",
    keywords: ["productivity", "workflow", "automation", "notification", "效率"]
  },
  {
    id: "entertainment-tools",
    label: "Entertainment Tools",
    description: "Lightweight creative, random content, and casual interaction tools.",
    icon: "FUN",
    keywords: ["fun", "random", "game", "creative", "娱乐"]
  },
  {
    id: "discovery-tools",
    label: "Discovery Tools",
    description: "Tool directories, resource navigation, site indexes, discovery entry points, and collections.",
    icon: "NAV",
    keywords: ["navigation", "discover", "directory", "index", "导航", "发现"]
  }
];

export function getCategoryMeta(category: ToolCategory) {
  return categories.find((item) => item.id === category) ?? null;
}
