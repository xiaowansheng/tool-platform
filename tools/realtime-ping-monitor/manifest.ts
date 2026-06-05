import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "realtime-ping-monitor",
  name: "Real-time Ping Monitor",
  description: "实时网络延迟监控，支持 HTTP/WebSocket 探测与可视化延迟趋势图。",
  category: "ops-tools",
  tags: ["ping", "latency", "monitor", "realtime", "network"],
  icon: "activity",
  runtime: "realtime",
  featured: false,
  capabilities: ["network-probe", "latency-chart"],
  permissions: []
};

export default manifest;
