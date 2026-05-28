import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "mock-data-generator",
  name: "Mock Data Generator",
  description: "按字段 schema 生成可复现的 mock 数据，并导出 JSON、NDJSON 或 CSV。",
  category: "developer",
  subCategory: "data",
  tags: ["mock", "faker", "json", "csv", "seed"],
  icon: "dice-5",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
