import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "utm-builder",
  name: "UTM Builder",
  description: "生成带 UTM 参数的营销链接，并保留原始查询参数。",
  category: "社媒工具",
  subCategory: "seo",
  tags: ["utm", "url", "campaign", "analytics"],
  icon: "chart-no-axes-combined",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
