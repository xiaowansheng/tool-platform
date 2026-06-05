import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "shipping-cost-calculator",
  name: "Shipping Cost Calculator",
  description: "运费估算器，支持多种物流方式、重量区间与目的地。",
  category: "ecommerce-tools",
  tags: ["shipping", "cost", "logistics", "ecommerce"],
  icon: "truck",
  runtime: "simple",
  featured: false
};

export default manifest;
