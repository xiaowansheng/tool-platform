import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "user-agent-parser",
  name: "User-Agent Parser & Analyzer",
  description: "一键探测载入本机 UA，多维度精准解析 User-Agent 字符串中的操作系统版本、设备品牌、排版内核、内置 App WebView 容器以及搜索引擎蜘蛛爬虫特征。",
  category: "webmaster-tools",
  subCategory: "debugging",
  tags: ["user-agent", "browser", "device", "debug", "bot"],
  icon: "monitor-smartphone",
  runtime: "simple",
  featured: true,
  permissions: ["clipboard"]
};

export default manifest;
