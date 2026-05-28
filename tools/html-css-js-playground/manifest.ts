import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "html-css-js-playground",
  name: "HTML CSS JS Playground",
  description: "在 iframe sandbox 中预览 HTML、CSS 和 JavaScript 片段，并导出完整单文件示例。",
  category: "developer-tools",
  subCategory: "sandbox",
  tags: ["html", "css", "javascript", "sandbox", "preview"],
  icon: "code-2",
  runtime: "sandbox",
  isolation: "iframe",
  sandbox: true,
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["iframe-sandbox", "live-preview", "single-file-export"]
};

export default manifest;
