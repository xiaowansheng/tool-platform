import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "user-agent-parser",
  name: "User-Agent Parser",
  description: "本地解析 User-Agent 中的浏览器、系统和设备线索。",
  category: "站长工具",
  subCategory: "debugging",
  tags: ["user-agent", "browser", "device", "debug"],
  icon: "monitor-smartphone",
  runtime: "simple",
  featured: false
};

export default manifest;
