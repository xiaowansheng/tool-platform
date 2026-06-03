import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "neon-snake",
  name: "Neon Snake",
  description: "赛博霓虹贪吃蛇游戏，配备炫目粒子吃食特效、震屏反馈、速度难度调节及复古街机电子合成音效，支持自定义外观与障碍物模式。",
  category: "entertainment-tools",
  subCategory: "random",
  tags: ["snake", "retro-game", "arcade", "neon", "action", "casual", "game"],
  icon: "zap",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["snake-gameplay", "audio-effects", "score-storage"]
};

export default manifest;
