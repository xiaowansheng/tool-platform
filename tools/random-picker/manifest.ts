import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "random-picker",
  name: "Random Picker",
  description: "随机抽取数字与列表选项工具，支持范围取数、列表去重、历史记录与滚轮动画效果。",
  category: "entertainment-tools",
  subCategory: "random",
  tags: ["random", "picker", "draw", "number", "list-picker", "lucky"],
  icon: "shuffle",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["random-number", "list-draw", "seeded-result", "history-copy"]
};

export default manifest;
