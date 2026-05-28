import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "cors-diagnostics",
  name: "CORS Diagnostics",
  description: "生成 CORS 响应头，并诊断 credentials、origin、method 配置问题。",
  category: "站长工具",
  subCategory: "security",
  tags: ["cors", "headers", "origin", "preflight"],
  icon: "shield-alert",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
