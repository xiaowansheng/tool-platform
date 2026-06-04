import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "beat-analyzer",
  name: "节拍记录分析器 (Beat Tap Analyzer)",
  description: "通过键盘空格键或鼠标点击记录您的敲击节拍，分析节拍间隔与稳定性，并生成节拍分布图表。",
  category: "media-tools",
  tags: ["beat", "tap", "rhythm", "tempo", "analyzer", "audio"],
  icon: "activity",
  runtime: "simple",
  featured: true
};

export default manifest;
