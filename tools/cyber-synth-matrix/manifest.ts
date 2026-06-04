import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "cyber-synth-matrix",
  name: "Cyber Synth Matrix",
  description: "赛博霓虹电子音乐步进器，具备 16 步进节奏矩阵、4 种合成器轨道（主音、低音、和弦、节奏敲击）、音色合成滤波器、动效波形可视化与预设电音模板，支持本地导出/分享音乐代码。",
  category: "entertainment-tools",
  subCategory: "game",
  tags: ["synth", "sequencer", "beatmaker", "neon", "music", "retro", "creative"],
  icon: "music",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"],
  capabilities: ["audio-synthesizer", "sequencer-engine", "music-export"]
};

export default manifest;
