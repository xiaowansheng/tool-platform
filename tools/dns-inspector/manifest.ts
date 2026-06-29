import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "dns-inspector",
  name: "DNS Inspector",
  description: "通过公共 DoH（Cloudflare/Google）或本地系统 DNS 模块查询 A、AAAA、CNAME、MX、TXT、NS 等解析记录，支持局域网、内网主机名以及 Hosts 映射诊断。",
  category: "webmaster-tools",
  subCategory: "dns",
  tags: ["dns", "doh", "records", "mx", "txt"],
  icon: "network",
  runtime: "simple",
  featured: true,
  capabilities: ["dns-over-https", "dns-resolve"]
};

export default manifest;
