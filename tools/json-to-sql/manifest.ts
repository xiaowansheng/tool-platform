import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "json-to-sql",
  name: "JSON to SQL Insert Converter",
  description: "JSON to SQL Insert Converter workspace",
  category: "data-tools",
  tags: ["json", "sql", "convert"],
  icon: "database-backup",
  runtime: "simple",
  featured: true
};

export default manifest;
