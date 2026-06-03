import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "memory-match",
  name: "Memory Match",
  description: "精美 3D 翻牌记忆力训练游戏，拥有丝滑的翻转动画、多种卡片主题（技术图标、趣味表情、赛博霓虹）、连消得分加成及合成器轻快音效，支持不同棋盘大小与最高分纪录保存。",
  category: "entertainment-tools",
  subCategory: "random",
  tags: ["memory", "match", "cards", "3d-flip", "puzzle", "casual", "game"],
  icon: "layers",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["memory-gameplay", "audio-effects", "score-storage"]
};

export default manifest;
