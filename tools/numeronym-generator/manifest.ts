import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "numeronym-generator",
  name: "Numeronym Generator",
  description: "生成数字缩写词（如 internationalization → i18n），批量处理单词列表。",
  category: "text-tools",
  subCategory: "text-processing",
  tags: ["numeronym", "abbreviation", "i18n", "l10n", "shorten"],
  icon: "type",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
