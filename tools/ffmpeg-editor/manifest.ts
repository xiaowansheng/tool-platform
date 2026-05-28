import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ffmpeg-editor",
  name: "FFmpeg Editor",
  description: "生成常见转码、裁剪、缩放和抽帧 FFmpeg 命令，并预览本地媒体文件信息。",
  category: "video",
  subCategory: "media",
  tags: ["ffmpeg", "video", "audio", "transcode"],
  icon: "film",
  runtime: "simple",
  featured: false,
  permissions: ["filesystem", "clipboard"],
  capabilities: ["command-builder", "media-preview"]
};

export default manifest;
