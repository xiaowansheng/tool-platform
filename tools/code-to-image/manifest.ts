import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "code-to-image",
  name: "代码美化图片生成器",
  description: "将代码或文本片段转换成精美的高清分享卡片图片。支持自定义背景渐变、代码主题、macOS 窗口栏及边角参数。",
  category: "image-tools",
  subCategory: "processing",
  tags: ["code-to-image", "carbon", "code-card", "designer"],
  icon: "image",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
