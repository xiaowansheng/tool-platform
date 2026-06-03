import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "gobang-game",
  name: "Gobang Game",
  description: "经典五子棋对弈游戏，提供人机对战（智能启发式AI）与双人同屏对战模式，具备悔棋、落子声效、胜利连线高亮及逼真棋盘视觉效果。",
  category: "entertainment-tools",
  subCategory: "random",
  tags: ["gobang", "chess", "board-game", "logic", "casual", "game"],
  icon: "table",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["gobang-gameplay", "audio-effects", "game-history"]
};

export default manifest;
