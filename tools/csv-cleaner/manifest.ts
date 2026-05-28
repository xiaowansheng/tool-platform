import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "csv-cleaner",
  name: "CSV Cleaner",
  description: "清洗、去重、排序和筛选 CSV 表格，并输出可复制的标准 CSV。",
  category: "data-tools",
  subCategory: "data",
  tags: ["csv", "clean", "dedupe", "sort", "filter"],
  icon: "table-properties",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
