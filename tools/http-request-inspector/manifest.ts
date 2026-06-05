import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "http-request-inspector",
  name: "HTTP Request Inspector",
  description: "发送自定义 HTTP 请求并查看完整的响应头、状态码、重定向链和响应体。",
  category: "webmaster-tools",
  subCategory: "http",
  tags: ["http", "request", "headers", "response", "debug", "network"],
  icon: "radio-tower",
  runtime: "simple",
  featured: false,
  capabilities: ["http-request"],
  permissions: []
};

export default manifest;
