import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "neon-tetris",
  name: "Neon Tetris",
  description: "赛博霓虹经典方块游戏，拥有炫酷的流光特效、满行消除爆破动画、行数与等级成长机制，配有合成器音乐般动作音效，支持按键暂存（Hold）与下坠预测。",
  category: "entertainment-tools",
  subCategory: "random",
  tags: ["tetris", "retro-game", "arcade", "neon", "puzzle", "casual", "game"],
  icon: "layout-grid",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["tetris-gameplay", "audio-effects", "score-storage"]
};

export default manifest;
