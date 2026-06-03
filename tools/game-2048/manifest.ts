import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "game-2048",
  name: "2048 Game",
  description: "经典 2048 数字拼图游戏，支持 3x3、4x4、5x5 多种棋盘，具备丝滑的滑动合体动画、音效及键盘和触屏滑动操作。",
  category: "entertainment-tools",
  subCategory: "random",
  tags: ["2048", "puzzle", "number-game", "slide", "casual", "game"],
  icon: "grid",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["2048-gameplay", "audio-effects", "score-storage"]
};

export default manifest;
