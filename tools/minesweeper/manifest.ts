import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "minesweeper",
  name: "Minesweeper",
  description: "经典扫雷游戏，支持初级、中级、高级与自定义参数，配备计时器、雷数指示、双击排雷与拟真爆炸音画效果。",
  category: "entertainment-tools",
  subCategory: "random",
  tags: ["minesweeper", "retro-game", "mines", "casual", "puzzle", "game"],
  icon: "bomb",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["minesweeper-gameplay", "audio-effects", "time-record"]
};

export default manifest;
