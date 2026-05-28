import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "open-graph-preview",
  name: "Open Graph Image Preview",
  description: "预览链接在 Facebook、LinkedIn、X 等平台中的 Open Graph 展示效果。",
  category: "社媒工具",
  subCategory: "seo",
  tags: ["open graph", "og image", "social preview", "twitter card", "seo"],
  icon: "panel-top",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
