import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "privacy-cookie-copy-generator",
  name: "Privacy / Cookie Copy Generator",
  description: "根据数据类型、用途和 Cookie 分类生成隐私政策与 Cookie 文案草稿。",
  category: "text",
  subCategory: "privacy",
  tags: ["privacy", "cookie", "policy", "gdpr", "copy"],
  icon: "scroll-text",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
