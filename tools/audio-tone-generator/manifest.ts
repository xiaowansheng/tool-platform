import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "audio-tone-generator",
  name: "Audio Tone Generator",
  description: "用 Web Audio 生成测试音、扫频和节拍，支持频率、波形、音量、时长与 WAV 下载。",
  category: "media-tools",
  subCategory: "audio",
  tags: ["audio", "tone", "wave", "wav", "metronome"],
  icon: "audio-waveform",
  runtime: "realtime",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["web-audio", "tone-test", "wav-export"]
};

export default manifest;
