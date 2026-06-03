import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "chinese-converter",
  name: "中文简繁体转换",
  description: "提供专业的高质量中文简繁体转换。支持大陆简体、台湾正体、香港繁体以及地区词汇/习惯用语替换（例如：软件 -> 軟體，鼠标 -> 滑鼠）。",
  category: "text-tools",
  tags: ["chinese", "converter", "simplified", "traditional", "localization"],
  icon: "languages",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
