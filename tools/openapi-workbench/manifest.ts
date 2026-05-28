import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "openapi-workbench",
  name: "OpenAPI Workbench",
  description: "查看、格式化、Diff OpenAPI/Swagger JSON，并生成基础 Mock 响应。",
  category: "developer",
  subCategory: "api",
  tags: ["openapi", "swagger", "diff", "mock"],
  icon: "route",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
