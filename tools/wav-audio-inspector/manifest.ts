import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "wav-audio-inspector",
  name: "WAV Audio Inspector",
  description: "解析 WAV 音频文件的头部信息，显示采样率、位深度、声道数、时长等元数据。",
  category: "media-tools",
  subCategory: "audio",
  tags: ["wav", "audio", "inspector", "header", "sample-rate", "bit-depth", "metadata"],
  icon: "audio-waveform",
  runtime: "simple",
  featured: false,
  permissions: []
};

export default manifest;
