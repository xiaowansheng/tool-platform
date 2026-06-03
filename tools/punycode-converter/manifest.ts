import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "punycode-converter",
  name: "Punycode 编码转换",
  description: "将国际化域名（IDN）与 Punycode (xn--) 编码双向转换，支持完整域名和单标签。",
  category: "webmaster-tools",
  subCategory: "dns",
  tags: ["punycode", "idn", "domain", "国际化域名", "xn--"],
  icon: "globe",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
