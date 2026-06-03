import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "horoscope-calculator",
  name: "星座查询工具",
  description: "星座查询工具 workspace",
  category: "娱乐工具",
  tags: ["horoscope-calculator"],
  icon: "sparkles",
  runtime: "simple",
  featured: false
};

export default manifest;
