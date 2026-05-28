import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "terraform-plan-formatter",
  name: "Terraform Plan Formatter",
  description: "整理 Terraform plan 输出，汇总 create/update/delete/replace 操作。",
  category: "运维工具",
  subCategory: "iac",
  tags: ["terraform", "plan", "iac", "formatter"],
  icon: "braces",
  runtime: "simple",
  featured: false
};

export default manifest;
