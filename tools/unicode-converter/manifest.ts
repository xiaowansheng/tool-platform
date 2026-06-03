import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "unicode-converter",
  name: "Unicode 编码转换器",
  description: "在原生字符与 Unicode 转义符、HTML 实体、URL 编码、UTF-8/UTF-16 十六进制等多种字符编码表示格式之间进行双向快速转换。",
  category: "text-tools",
  subCategory: "encoding",
  tags: ["unicode", "escape", "convert", "hex", "html-entity", "url-encode"],
  icon: "binary",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
