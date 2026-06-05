import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "parquet-schema-viewer",
  name: "Parquet Schema Viewer",
  description: "可视化浏览 Parquet 文件的 schema、列类型与元数据统计。",
  category: "data-tools",
  tags: ["parquet", "schema", "columnar", "metadata"],
  icon: "columns",
  runtime: "simple",
  featured: false
};

export default manifest;
