import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "random-team-generator",
  name: "随机分队生成器",
  description: "把名单随机分队，支持种子、队伍数量、每队人数和避开同组约束。",
  category: "productivity-tools",
  tags: ["random", "team", "generator", "group", "picker"],
  icon: "users",
  runtime: "simple",
  featured: false
};

export default manifest;
