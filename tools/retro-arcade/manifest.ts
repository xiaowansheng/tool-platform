import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "retro-arcade",
  name: "赛博街机模拟器 (Retro Arcade Platform)",
  description: "一款高保真、沉浸式的赛博霓虹街机中心，聚合 Flappy Bird、接金币、打地鼠、射击小游戏、华容道、九宫拼图、泡泡龙、宝石消消乐和祖玛等九款经典复古街机与益智小游戏，配备复古合成器音效和粒子动画。",
  category: "entertainment-tools",
  tags: ["arcade", "retro-games", "flappy-bird", "whack-a-mole", "puzzle", "bubble-shooter", "match-3", "zuma", "casual"],
  icon: "gamepad",
  runtime: "simple",
  featured: true
};

export default manifest;
