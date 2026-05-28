import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "sbom-viewer",
  name: "SBOM Viewer",
  description: "解析 CycloneDX / SPDX SBOM，查看组件、许可证、依赖和漏洞摘要。",
  category: "security-tools",
  subCategory: "security",
  tags: ["sbom", "cyclonedx", "spdx", "license", "supply-chain"],
  icon: "package-search",
  runtime: "simple",
  featured: true
};

export default manifest;
