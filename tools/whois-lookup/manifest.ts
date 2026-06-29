import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "whois-lookup",
  name: "Domain WHOIS Lookup",
  description: "向权威域名数据库查询 WHOIS 注册记录，解析域名持有状态、注册商、创建与到期日期及 DNS 解析服务器配置。",
  category: "webmaster-tools",
  tags: ["whois", "domain", "dns", "registrar", "network", "webmaster"],
  icon: "globe",
  runtime: "realtime",
  featured: true,
  capabilities: ["whois-lookup"]
};

export default manifest;
