import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "network-connection-info",
  name: "Network Connection Info",
  description: "查看浏览器 Network Information API 提供的连接类型、下行速度、RTT 等实时网络状态。",
  category: "ops-tools",
  subCategory: "diagnostics",
  tags: ["network", "connection", "bandwidth", "rtt", "diagnostics"],
  icon: "activity",
  runtime: "simple",
  featured: false,
  capabilities: ["network-info-api"],
  permissions: []
};

export default manifest;
