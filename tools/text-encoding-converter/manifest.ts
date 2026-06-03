import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "text-encoding-converter",
  name: "文字编码转换与乱码修复",
  description: "支持在 UTF-8、GBK、GB2312、Big5、UTF-16、ASCII、ISO-8859-1 等多种文字编码之间相互转换，并能实时修复因编码不匹配产生的中文乱码（如将 GBK 乱码恢复为正常 UTF-8 文本）。",
  category: "text-tools",
  tags: ["text", "encoding", "converter", "mojibake", "gbk", "utf8", "big5"],
  icon: "binary",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
