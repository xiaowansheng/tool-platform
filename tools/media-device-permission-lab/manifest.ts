import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "media-device-permission-lab",
  name: "Media Device Permission Lab",
  description: "检测 camera/microphone 权限、枚举媒体设备、预览摄像头并显示麦克风实时音量。",
  category: "media-tools",
  subCategory: "capture",
  tags: ["camera", "microphone", "media-devices", "permission", "preview"],
  icon: "video",
  runtime: "realtime",
  featured: false,
  permissions: ["camera", "microphone"],
  capabilities: ["camera-preview", "microphone-meter", "device-enumeration"]
};

export default manifest;
