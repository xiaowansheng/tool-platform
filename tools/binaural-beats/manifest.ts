import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "binaural-beats",
  name: "Binaural Beats",
  description: "双耳节拍发生器，支持不同频率组合、背景粉红噪音与定时关闭。",
  category: "media-tools",
  tags: ["binaural", "audio", "meditation", "realtime"],
  icon: "headphones",
  runtime: "realtime",
  featured: false,
  capabilities: ["web-audio", "binaural"],
  permissions: []
};

export default manifest;
