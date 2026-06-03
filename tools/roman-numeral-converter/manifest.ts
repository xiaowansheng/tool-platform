import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "roman-numeral-converter",
  name: "Roman Numeral Converter",
  description: "罗马数字与阿拉伯数字之间的相互转换，支持 1-3999 范围。",
  category: "calculator-tools",
  subCategory: "converter",
  tags: ["roman", "numeral", "number", "converter"],
  icon: "hash",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
