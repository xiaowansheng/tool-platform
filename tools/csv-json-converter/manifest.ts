import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "csv-json-converter",
  name: "CSV ↔ JSON Converter",
  description: "CSV 与 JSON 互转，支持嵌套结构、自定义分隔符与编码检测。",
  category: "data-tools",
  tags: ["csv", "json", "convert", "transform"],
  icon: "file-spreadsheet",
  runtime: "simple",
  featured: false
};

export default manifest;
