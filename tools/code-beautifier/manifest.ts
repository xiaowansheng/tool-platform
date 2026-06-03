import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "code-beautifier",
  name: "代码美化与压缩工具",
  description: "本地对 HTML、CSS 和 JavaScript 代码进行一键格式化美化或压缩混淆，提升加载速度与代码可读性。",
  category: "developer-tools",
  subCategory: "processing",
  tags: ["formatter", "beautifier", "minifier", "minify", "beautify"],
  icon: "braces",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
