import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "web-component-lab",
  name: "Web Component Lab",
  description: "在 iframe 沙箱中编写 Web Component 自定义元素，实时预览并查看 Shadow DOM 结构。",
  category: "developer-tools",
  tags: ["web-component", "custom-element", "shadow-dom", "sandbox"],
  icon: "code-2",
  runtime: "sandbox",
  featured: false,
  sandbox: true,
  isolation: "iframe",
  capabilities: ["iframe-sandbox", "web-component", "shadow-dom"],
  permissions: ["clipboard"]
};

export default manifest;
