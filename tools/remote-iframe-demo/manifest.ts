import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "remote-iframe-demo",
  name: "Remote Iframe Demo",
  description: "Remote Iframe Demo remote iframe workspace",
  category: "developer-tools",
  tags: ["remote-iframe-demo", "remote", "iframe"],
  icon: "panel-top",
  runtime: "remote",
  featured: false,
  isolation: "iframe",
  sandbox: true,
  permissions: [],
  capabilities: ["remote-iframe"],
  microFrontend: {
    kind: "iframe",
    url: "/remote-tools/demo/index.html",
    title: "Remote Iframe Demo"
  }
};

export default manifest;
