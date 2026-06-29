import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ip-geolocation",
  name: "IP Geolocation",
  description: "查询指定 IP 的物理地理位置、ISP 与时区坐标，支持一键探测本机出口公网 IP 地址，提供服务端反代防止广告插件拦截。",
  category: "webmaster-tools",
  subCategory: "ip",
  tags: ["ip", "geolocation", "geoip", "location", "network"],
  icon: "map-pin",
  runtime: "simple",
  featured: true,
  capabilities: ["geoip-lookup"],
  permissions: []
};

export default manifest;
