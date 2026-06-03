import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "loan-calculator",
  name: "房贷与贷款计算器",
  description: "支持等额本息 (Equal Principal & Interest) 和等额本金 (Equal Principal) 两种主流还款方式。实时生成还款详情、每月还款金额及利息走势，并提供完整的每月还款本息明细表。",
  category: "calculator-tools",
  tags: ["loan", "mortgage", "calculator", "finance", "interest"],
  icon: "calculator",
  runtime: "simple",
  featured: true,
  permissions: []
};

export default manifest;
