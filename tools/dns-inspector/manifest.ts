import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "dns-inspector",
  name: "DNS Inspector",
  description: "通过 DNS-over-HTTPS 查询 A、AAAA、MX、TXT、NS、SOA、CAA 等记录并展示 TTL 与响应状态。",
  category: "站长工具",
  subCategory: "dns",
  tags: ["dns", "doh", "records", "mx", "txt"],
  icon: "network",
  runtime: "simple",
  featured: true,
  capabilities: ["dns-over-https"]
};

export default manifest;
