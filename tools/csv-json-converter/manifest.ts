import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "csv-json-converter",
  name: "CSV JSON Converter",
  description: "在 CSV 表格和 JSON 数组之间互转，适合小型数据整理。",
  category: "developer",
  subCategory: "data",
  tags: ["csv", "json", "table", "converter"],
  icon: "table",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
