import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ascii-binary-converter",
  name: "ASCII Binary Converter",
  description: "将文本转换为 ASCII 二进制表示（如 01001000 01101001），或从二进制还原为文本。",
  category: "text-tools",
  subCategory: "encoding",
  tags: ["ascii", "binary", "bits", "converter", "encoding"],
  icon: "binary",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
