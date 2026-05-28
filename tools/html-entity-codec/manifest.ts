import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "html-entity-codec",
  name: "HTML Entity Codec",
  description: "编码和解码 HTML 实体，避免文案或代码片段被浏览器解析。",
  category: "text-tools",
  subCategory: "encoding",
  tags: ["html", "entity", "escape", "decode"],
  icon: "code-xml",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
