import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "number-base-converter",
  name: "Number Base Converter",
  description: "在二进制、八进制、十进制和十六进制之间转换整数。",
  category: "calculator-tools",
  subCategory: "number",
  tags: ["binary", "hex", "decimal", "converter"],
  icon: "binary",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
