import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ecommerce-margin-calculator",
  name: "Ecommerce Margin Calculator",
  description: "按售价、成本、平台费、广告费、物流和退货率计算电商毛利、净利、保本 ROAS 和建议售价。",
  category: "电商工具",
  subCategory: "pricing",
  tags: ["ecommerce", "margin", "roas", "pricing", "profit"],
  icon: "shopping-cart",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["margin-math", "roas-break-even", "pricing-summary"]
};

export default manifest;
