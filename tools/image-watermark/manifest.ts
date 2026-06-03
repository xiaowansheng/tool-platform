import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "image-watermark",
  name: "图片防盗水印生成器",
  description: "在本地浏览器中为您的敏感证件、文档图片添加盲水印或平铺文字水印，防止滥用，保护个人隐私安全。",
  category: "image-tools",
  subCategory: "processing",
  tags: ["image-watermark", "privacy", "security", "watermark"],
  icon: "shield-alert",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
