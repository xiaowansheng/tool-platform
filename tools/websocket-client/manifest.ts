import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "websocket-client",
  name: "WebSocket Client",
  description: "连接 ws/wss 端点、发送消息并查看事件日志的 WebSocket 调试客户端。",
  category: "站长工具",
  subCategory: "debugging",
  tags: ["websocket", "ws", "realtime", "debug", "network"],
  icon: "radio-tower",
  runtime: "realtime",
  featured: true,
  capabilities: ["websocket"]
};

export default manifest;
