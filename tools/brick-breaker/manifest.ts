import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "brick-breaker",
  name: "Brick Breaker",
  description: "炫彩霓虹打砖块游戏。拥有流畅的 Canvas 粒子动画、多种增益道具（多球分裂、挡板加长、磁力吸附、激光射击、保护盾）、多种关卡设计与物理碰撞音效合成器，支持键盘/鼠标/触屏控制与视觉特效配置。",
  category: "entertainment-tools",
  subCategory: "random",
  tags: ["brick", "breaker", "canvas", "neon", "physics", "arcade", "game"],
  icon: "gamepad-2",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["canvas-gameplay", "audio-effects", "score-storage"]
};

export default manifest;
