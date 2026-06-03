import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "coordinate-converter",
  name: "坐标系转换",
  description: "在 WGS-84、GCJ-02 和 BD-09 坐标系之间转换 GPS 经纬度。",
  category: "calculator-tools",
  subCategory: "geography",
  tags: ["gps", "coordinate", "wgs84", "gcj02", "bd09", "经纬度", "坐标"],
  icon: "map-pin",
  runtime: "simple",
  featured: false
};

export default manifest;
