import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "browser-sandbox-console",
  name: "Browser Sandbox Console",
  description: "在隔离 iframe 中运行 HTML/CSS/JS 片段，捕获 console 输出并生成可复制的 srcdoc。",
  category: "开发工具",
  subCategory: "sandbox",
  tags: ["sandbox", "iframe", "html", "css", "javascript", "console"],
  icon: "square-terminal",
  runtime: "sandbox",
  featured: false,
  sandbox: true,
  isolation: "iframe",
  permissions: ["clipboard"],
  capabilities: ["iframe-sandbox", "console-capture", "srcdoc-preview"]
};

export default manifest;
