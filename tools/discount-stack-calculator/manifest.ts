import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "discount-stack-calculator",
  name: "Discount Stack Calculator",
  description: "模拟百分比、满减、优惠码、税费和物流叠加后的订单价格、折扣率与利润影响。",
  category: "ecommerce-tools",
  subCategory: "pricing",
  tags: ["discount", "coupon", "ecommerce", "pricing", "margin"],
  icon: "badge-percent",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["discount-stack", "tax-shipping", "profit-impact"]
};

export default manifest;
