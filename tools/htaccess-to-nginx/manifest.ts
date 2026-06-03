import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "htaccess-to-nginx",
  name: "htaccess 转 Nginx 规则工具",
  description: "将 Apache 的 .htaccess 重写规则 (RewriteRules) 转换为 Nginx 对应的 Web 服务器重写配置指令。",
  category: "ops-tools",
  subCategory: "config",
  tags: ["htaccess", "nginx", "rewrite", "apache", "config"],
  icon: "server",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
