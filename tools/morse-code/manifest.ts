import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "morse-code",
  name: "摩尔斯电码转换器",
  description: "摩尔斯电码 (Morse Code) 编码与解码工具。支持自定义电码符号、调整播放速度及音频播放预览。",
  category: "text-tools",
  subCategory: "encoding",
  tags: ["morse-code", "translator", "audio", "geek"],
  icon: "radio",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
