import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ipv4-cidr-calculator",
  name: "IPv4 CIDR Calculator",
  description: "计算 IPv4 CIDR 网段、掩码、广播地址和可用主机数。",
  category: "network",
  subCategory: "ip",
  tags: ["ipv4", "cidr", "subnet", "network"],
  icon: "network",
  runtime: "simple",
  featured: false
};

export default manifest;
