import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "digital-muyu",
  name: "赛博禅堂 (Cyber Zen Temple)",
  description: "一款全功能数字禅修解压工具，包含电子木鱼机（支持自动敲击与机甲齿轮动效）、电子烧香炉（烟雾飘落与燃尽模拟）、以及电子跪拜垫（虔诚祈福动作与铜磬音效），帮您消解焦虑，广积功德。",
  category: "entertainment-tools",
  tags: ["zen", "muyu", "incense", "worship", "meditation", "relax", "audio"],
  icon: "heart",
  runtime: "simple",
  featured: true
};

export default manifest;
