import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ipv6-subnet-calculator",
  name: "IPv6 Subnet Calculator",
  description: "计算 IPv6 网段信息：前缀、子网掩码、地址总数与范围，支持缩写展开。",
  category: "webmaster-tools",
  subCategory: "ip",
  tags: ["ipv6", "subnet", "cidr", "network", "calculator"],
  icon: "network",
  runtime: "simple",
  featured: false,
  permissions: []
};

export default manifest;
