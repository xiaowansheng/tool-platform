import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "http-redirect-tracker",
  name: "HTTP Redirect Tracker",
  description: "追踪 HTTP 重定向链，查看每一步的状态码、URL 跳转和响应头变化。",
  category: "webmaster-tools",
  subCategory: "http",
  tags: ["http", "redirect", "301", "302", "seo", "network"],
  icon: "git-branch",
  runtime: "simple",
  featured: false,
  capabilities: ["redirect-trace"],
  permissions: []
};

export default manifest;
