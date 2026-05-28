import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "random-team-generator",
  name: "Random Team Generator",
  description: "把名单随机分队，支持种子、队伍数量、每队人数和避开同组约束，适合活动和课堂分组。",
  category: "娱乐工具",
  subCategory: "random",
  tags: ["random", "team", "group", "seed", "activity"],
  icon: "shuffle",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["seeded-random", "team-balance", "copyable-groups"]
};

export default manifest;
