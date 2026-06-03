import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "dice-roller",
  name: "Dice Roller",
  description: "3D 拟真摇色子工具与趣味骰子游戏（骰宝、骰子对决），支持多种多面体骰子与逼真碰撞滚动音画效果。",
  category: "entertainment-tools",
  subCategory: "random",
  tags: ["dice", "roller", "3d-dice", "random", "sic-bo", "game", "shake"],
  icon: "dices",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["3d-dice-roll", "sic-bo-game", "dice-battle", "audio-effects"]
};

export default manifest;
