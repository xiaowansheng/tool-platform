import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "semgrep-rule-playground",
  name: "Semgrep Rule Playground",
  description: "用轻量本地匹配预览 Semgrep YAML 规则、样例代码命中和规则元数据。",
  category: "developer",
  subCategory: "security",
  tags: ["semgrep", "sast", "rule", "security", "static-analysis"],
  icon: "scan-search",
  runtime: "simple",
  featured: false
};

export default manifest;
