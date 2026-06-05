import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "visual-metronome",
  name: "Visual Metronome",
  description: "带视觉引导的高精度节拍器：摆锤动画、光脉冲、节奏模式与 Tap 测速。",
  category: "media-tools",
  tags: ["metronome", "visual", "bpm", "rhythm"],
  icon: "timer",
  runtime: "realtime",
  featured: false,
  capabilities: ["web-audio", "tempo-tap", "visual-beat"],
  permissions: []
};

export default manifest;
