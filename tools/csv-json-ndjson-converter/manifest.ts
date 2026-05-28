import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "csv-json-ndjson-converter",
  name: "CSV JSON NDJSON Converter",
  description: "在 CSV、JSON 数组和 NDJSON 流之间互转，保留列名和对象字段。",
  category: "data-tools",
  subCategory: "data",
  tags: ["csv", "json", "ndjson", "converter"],
  icon: "shuffle",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
