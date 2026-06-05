import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "network-bandwidth-calculator",
  name: "Bandwidth Calculator",
  description: "计算网络传输时间、数据大小与带宽之间的换算，支持多种单位。",
  category: "webmaster-tools",
  subCategory: "calculator",
  tags: ["bandwidth", "network", "calculator", "transfer", "speed"],
  icon: "gauge",
  runtime: "simple",
  featured: false,
  permissions: []
};

export default manifest;
