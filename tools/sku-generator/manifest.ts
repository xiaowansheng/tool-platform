import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "sku-generator",
  name: "SKU Generator",
  description: "按品牌、品类、颜色、尺码和序号批量生成规范 SKU，并导出 CSV 映射表。",
  category: "电商工具",
  subCategory: "catalog",
  tags: ["sku", "ecommerce", "catalog", "inventory", "csv"],
  icon: "barcode",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["sku-batch", "catalog-variants", "csv-export"]
};

export default manifest;
