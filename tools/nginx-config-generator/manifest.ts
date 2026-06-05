import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "nginx-config-generator",
  name: "Nginx Config Generator",
  description: "Nginx 配置生成器，支持反向代理、负载均衡与 SSL 终端。",
  category: "ops-tools",
  tags: ["nginx", "config", "reverse-proxy", "load-balancer"],
  icon: "server",
  runtime: "simple",
  featured: false
};

export default manifest;
