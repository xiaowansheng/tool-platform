import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "reversi",
  name: "Reversi",
  description: "精美 3D 翻转动效黑白棋（奥赛罗）。支持双人同屏对战与人机对战（极简/中级 AI），提供落子步数提示、棋盘实时数量占比分析与物理撞击拟真音效，支持自定义棋盘配色主题。",
  category: "entertainment-tools",
  subCategory: "random",
  tags: ["reversi", "othello", "board", "strategy", "ai", "3d-flip", "game"],
  icon: "swords",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["board-gameplay", "ai-adversary", "audio-effects"]
};

export default manifest;
