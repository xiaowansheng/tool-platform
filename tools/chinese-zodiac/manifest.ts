import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "chinese-zodiac",
  name: "生肖查询工具",
  description: "输入年份查询对应生肖、五行属性、性格特点、幸运数字和最佳配对",
  category: "entertainment-tools",
  subCategory: "fortune",
  tags: ["chinese-zodiac", "zodiac", "生肖", "传统文化"],
  icon: "sparkles",
  runtime: "simple",
  featured: false
};

export default manifest;
