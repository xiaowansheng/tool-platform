import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "cyber-flyer",
  name: "Cyber Flyer",
  description: "赛博霓虹飞越太空游戏，配备炫目粒子引擎、防撞护盾/时空减速/超音速飞行道具、镜头震屏感官系统与 Web Audio 合成器音效，支持自定义外观与多种难度模式。",
  category: "entertainment-tools",
  subCategory: "game",
  tags: ["flyer", "retro-game", "arcade", "neon", "action", "casual", "game"],
  icon: "rocket",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["arcade-gameplay", "audio-effects", "score-storage"]
};

export default manifest;
