import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "my-device-info",
  name: "我的设备信息",
  description: "查看你的公网 IP、地理位置、ISP、浏览器和设备信息。",
  category: "ops-tools",
  subCategory: "diagnostics",
  tags: ["ip", "device", "browser", "user-agent", "geolocation", "network", "who-am-i"],
  icon: "monitor-smartphone",
  runtime: "simple",
  featured: false,
  capabilities: [],
  permissions: []
};

export default manifest;
