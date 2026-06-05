import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "spectrum-analyzer",
  name: "Spectrum Analyzer",
  description: "麦克风输入实时频谱可视化，支持 FFT 大小、窗口函数调节与峰值频率检测。",
  category: "media-tools",
  tags: ["audio", "spectrum", "visualizer", "realtime", "fft"],
  icon: "audio-waveform",
  runtime: "realtime",
  featured: false,
  capabilities: ["web-audio", "fft", "microphone"],
  permissions: ["microphone"]
};

export default manifest;
