import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "sudoku-game",
  name: "Sudoku Game",
  description: "经典数独游戏，支持多种难度，具备草稿笔记、一键排查冲突、计时与游戏存档功能，配有清新的动画及拟真音效。",
  category: "entertainment-tools",
  subCategory: "random",
  tags: ["sudoku", "puzzle", "number-game", "casual", "game", "logic"],
  icon: "grid",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["sudoku-gameplay", "audio-effects", "time-record"]
};

export default manifest;
