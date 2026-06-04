import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "metronome",
  name: "节拍器 (Metronome)",
  description: "支持精确节拍控制、多种拍子与细分选择、Tap手动测速和可视化摆钟的高保真节拍器。",
  category: "media-tools",
  subCategory: "audio",
  tags: ["metronome", "tempo", "beat", "bpm", "music", "audio"],
  icon: "music",
  runtime: "realtime",
  featured: true,
  permissions: [],
  capabilities: ["web-audio", "tempo-tap", "subdivision"]
};

export default manifest;
