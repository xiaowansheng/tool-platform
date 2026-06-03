import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "audio-waveform-visualizer",
  name: "音频波形可视化",
  description: "上传音频文件，使用 Canvas 绘制波形图，展示音频的振幅和频谱特征",
  category: "media-tools",
  subCategory: "audio",
  tags: ["audio", "waveform", "visualization", "canvas", "music"],
  icon: "activity",
  runtime: "simple",
  featured: false
};

export default manifest;
