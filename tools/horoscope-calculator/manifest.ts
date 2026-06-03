import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "horoscope-calculator",
  name: "星座查询工具",
  description: "根据出生日期查询所属星座、性格特点、幸运数字和最佳匹配星座",
  category: "entertainment-tools",
  subCategory: "fortune",
  tags: ["horoscope", "星座", "zodiac", "astrology"],
  icon: "sparkles",
  runtime: "simple",
  featured: false
};

export default manifest;
