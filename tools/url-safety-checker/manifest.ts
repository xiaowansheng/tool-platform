import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "url-safety-checker",
  name: "URL Safety Checker",
  description: "解析 URL 并标记不安全协议、混淆、凭据、私网地址和可疑结构。",
  category: "网络安全",
  subCategory: "security",
  tags: ["url", "phishing", "security", "network", "domain"],
  icon: "link-2-off",
  runtime: "simple",
  featured: false
};

export default manifest;
