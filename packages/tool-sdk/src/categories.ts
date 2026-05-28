import type { CategoryMeta, ToolCategory } from "@tool-platform/tool-contracts";

export const categories: CategoryMeta[] = [
  {
    id: "AI工具",
    label: "AI工具",
    description: "面向 LLM、Prompt、RAG、智能体、AI 安全、评测和模型成本的工具。",
    icon: "AI",
    keywords: ["ai", "llm", "prompt", "rag", "agent", "eval", "token", "模型", "智能体"]
  },
  {
    id: "开发工具",
    label: "开发工具",
    description: "覆盖 API、代码、Git、类型生成、调试、构建和开发辅助工作流。",
    icon: "</>",
    keywords: ["dev", "developer", "api", "git", "code", "debug", "typescript", "开发", "调试"]
  },
  {
    id: "运维工具",
    label: "运维工具",
    description: "聚合 Linux、Docker、Kubernetes、云原生、日志、监控、SLO 和故障处理工具。",
    icon: "OPS",
    keywords: ["ops", "linux", "docker", "kubernetes", "k8s", "terraform", "prometheus", "log", "运维"]
  },
  {
    id: "网络安全",
    label: "网络安全",
    description: "覆盖安全扫描、密钥、供应链、CVSS、CSP、PII、证书和网络风险检查。",
    icon: "SEC",
    keywords: ["security", "secrets", "cvss", "sbom", "csp", "pii", "tls", "安全", "网络安全"]
  },
  {
    id: "文件工具",
    label: "文件工具",
    description: "处理文件结构、归档、校验、元数据、批量文件和文档文件转换。",
    icon: "FILE",
    keywords: ["file", "archive", "checksum", "metadata", "pdf", "文件", "归档"]
  },
  {
    id: "图片工具",
    label: "图片工具",
    description: "面向图片压缩、EXIF、二维码、图标资产、OCR 和视觉输入预处理。",
    icon: "IMG",
    keywords: ["image", "ocr", "exif", "qr", "barcode", "favicon", "图片", "图像"]
  },
  {
    id: "视频音频",
    label: "视频音频",
    description: "处理音视频编辑、媒体设备、音视频素材和多媒体调试场景。",
    icon: "AV",
    keywords: ["video", "audio", "media", "ffmpeg", "camera", "microphone", "视频", "音频"]
  },
  {
    id: "文本工具",
    label: "文本工具",
    description: "提供文本编码、转换、检查、Diff、Markdown、正则和批量文本处理。",
    icon: "TXT",
    keywords: ["text", "markdown", "regex", "diff", "base64", "unicode", "encode", "decode", "文本", "编码"]
  },
  {
    id: "数据工具",
    label: "数据工具",
    description: "面向 JSON、CSV、YAML、SQL、Schema、Parquet、Mock 和结构化数据处理。",
    icon: "DATA",
    keywords: ["data", "json", "csv", "yaml", "sql", "database", "schema", "数据"]
  },
  {
    id: "办公工具",
    label: "办公工具",
    description: "支持 README、ADR、发布说明、报告、PDF、表格和日常办公文档生成。",
    icon: "DOC",
    keywords: ["office", "docs", "readme", "adr", "release", "pdf", "办公", "文档"]
  },
  {
    id: "设计工具",
    label: "设计工具",
    description: "覆盖颜色、排版、布局、阴影、渐变、动效和界面视觉调试。",
    icon: "UI",
    keywords: ["design", "css", "color", "layout", "typography", "gradient", "设计"]
  },
  {
    id: "SEO工具",
    label: "SEO工具",
    description: "面向 Meta、Open Graph、robots、slug、UTM 和搜索展示优化。",
    icon: "SEO",
    keywords: ["seo", "meta", "open graph", "robots", "slug", "utm", "站点优化"]
  },
  {
    id: "站长工具",
    label: "站长工具",
    description: "提供 DNS、HTTP、端口、CIDR、Header、Cookie、HAR 和网站诊断工具。",
    icon: "WEB",
    keywords: ["webmaster", "dns", "http", "header", "cookie", "har", "cidr", "站长"]
  },
  {
    id: "学习工具",
    label: "学习工具",
    description: "辅助学习、示例生成、知识检查、事实核查和练习材料准备。",
    icon: "EDU",
    keywords: ["learn", "study", "example", "checklist", "practice", "学习"]
  },
  {
    id: "计算工具",
    label: "计算工具",
    description: "提供百分比、单位、比例、进制、时间、成本和资源换算计算。",
    icon: "123",
    keywords: ["calculator", "unit", "convert", "ratio", "time", "cost", "计算", "换算"]
  },
  {
    id: "社媒工具",
    label: "社媒工具",
    description: "支持社交媒体分享预览、链接参数、图片卡片和平台素材准备。",
    icon: "SOC",
    keywords: ["social", "share", "open graph", "utm", "card", "社媒"]
  },
  {
    id: "电商工具",
    label: "电商工具",
    description: "面向电商内容、商品资料、转化追踪、隐私合规和运营辅助。",
    icon: "EC",
    keywords: ["ecommerce", "shop", "product", "conversion", "cookie", "电商"]
  },
  {
    id: "效率工具",
    label: "效率工具",
    description: "聚合日常效率、自动化、通知测试、清单生成和工作流辅助工具。",
    icon: "FAST",
    keywords: ["productivity", "workflow", "automation", "notification", "效率"]
  },
  {
    id: "娱乐工具",
    label: "娱乐工具",
    description: "承载轻量创作、趣味生成、随机内容和休闲互动工具。",
    icon: "FUN",
    keywords: ["fun", "random", "game", "creative", "娱乐"]
  },
  {
    id: "导航发现",
    label: "导航发现",
    description: "用于工具目录、资源导航、站点索引、发现入口和集合整理。",
    icon: "NAV",
    keywords: ["navigation", "discover", "directory", "index", "导航", "发现"]
  }
];

export function getCategoryMeta(category: ToolCategory) {
  return categories.find((item) => item.id === category) ?? null;
}
