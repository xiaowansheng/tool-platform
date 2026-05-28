import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "notification-payload-tester",
  name: "Notification Payload Tester",
  description: "配置、预览和复制浏览器 Notification API payload，记录授权状态与发送历史。",
  category: "productivity-tools",
  subCategory: "browser",
  tags: ["notification", "permission", "browser", "payload", "preview"],
  icon: "bell",
  runtime: "simple",
  featured: false,
  permissions: ["notification", "clipboard"],
  capabilities: ["notification-preview", "permission-check", "copyable-snippet"]
};

export default manifest;
