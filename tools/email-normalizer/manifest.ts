import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "email-normalizer",
  name: "Email Normalizer",
  description: "将电子邮件地址标准化为统一格式，支持去重、批量处理和 Gmail 点号/加号规则。",
  category: "data-tools",
  subCategory: "data-processing",
  tags: ["email", "normalize", "deduplicate", "gmail", "clean"],
  icon: "mail",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
