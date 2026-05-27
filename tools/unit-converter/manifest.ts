import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "unit-converter",
  name: "Unit Converter",
  description: "换算长度、重量、数据大小和温度等常用单位。",
  category: "productivity",
  subCategory: "calculator",
  tags: ["unit", "converter", "length", "temperature"],
  icon: "scale",
  runtime: "simple",
  featured: false
};

export default manifest;
