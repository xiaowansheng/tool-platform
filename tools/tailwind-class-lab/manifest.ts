import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "tailwind-class-lab",
  name: "Tailwind Class Lab",
  description: "整理 Tailwind class 顺序，预览常见 utility 的视觉结果并标记重复分组。",
  category: "design",
  subCategory: "css",
  tags: ["tailwind", "css", "sort", "preview"],
  icon: "wind",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
