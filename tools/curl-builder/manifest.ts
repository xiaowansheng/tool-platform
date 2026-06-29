import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "curl-builder",
  name: "cURL Builder & Parser",
  description: "支持 cURL 命令行语句的生成与反向解析，拆解提取 URL 参数与 Headers 进行可视化修改编辑，并支持代理在线发送测试请求。",
  category: "developer-tools",
  subCategory: "api",
  tags: ["curl", "api", "http", "request", "parser"],
  icon: "terminal",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["http-request"]
};

export default manifest;
