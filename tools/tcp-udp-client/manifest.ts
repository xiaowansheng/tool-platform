import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "tcp-udp-client",
  name: "TCP/UDP Client & Port Scanner",
  description: "连接 TCP/UDP 服务端发送自定义数据包、查看响应，同时支持快速 TCP 端口状态扫描排查。",
  category: "webmaster-tools",
  tags: ["tcp", "udp", "socket", "network", "port-scan", "debug"],
  icon: "radio-tower",
  runtime: "realtime",
  featured: true,
  capabilities: ["tcp-udp-socket"]
};

export default manifest;
