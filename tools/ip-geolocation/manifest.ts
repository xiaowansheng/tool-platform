import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ip-geolocation",
  name: "IP Geolocation",
  description: "通过 IP 地址查询地理位置、ISP 和时区等信息，支持 IPv4 和 IPv6。",
  category: "webmaster-tools",
  subCategory: "ip",
  tags: ["ip", "geolocation", "geoip", "location", "network"],
  icon: "map-pin",
  runtime: "simple",
  featured: false,
  capabilities: ["geoip-lookup"],
  permissions: []
};

export default manifest;
