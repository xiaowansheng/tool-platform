import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "mac-address-lookup",
  name: "MAC Address Lookup",
  description: "查询 MAC 地址前缀（OUI）对应的设备厂商信息，支持批量查询。",
  category: "webmaster-tools",
  subCategory: "reference",
  tags: ["mac", "oui", "vendor", "network", "hardware"],
  icon: "network",
  runtime: "simple",
  featured: false,
  capabilities: ["mac-oui-lookup"],
  permissions: []
};

export default manifest;
