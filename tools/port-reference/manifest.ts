import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "port-reference",
  name: "Port Reference",
  description: "查询常见服务端口，辅助排查网络和部署问题。",
  category: "webmaster-tools",
  subCategory: "reference",
  tags: ["port", "network", "tcp", "reference"],
  icon: "ethernet-port",
  runtime: "simple",
  featured: false
};

export default manifest;
