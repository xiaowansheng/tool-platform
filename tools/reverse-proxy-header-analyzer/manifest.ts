import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "reverse-proxy-header-analyzer",
  name: "Reverse Proxy Header Analyzer",
  description: "解析 X-Forwarded-*、Forwarded、Via 和真实 IP 头，推导客户端链路并提示代理信任风险。",
  category: "站长工具",
  subCategory: "proxy",
  tags: ["proxy", "headers", "x-forwarded-for", "forwarded", "client-ip"],
  icon: "route",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["header-parse", "client-ip-chain", "trust-boundary-review"]
};

export default manifest;
