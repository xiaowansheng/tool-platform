import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "design-token-generator",
  name: "Design Token Generator",
  description: "从 CSS/JSON 提取设计 Token，生成颜色、间距、阴影等统一规范。",
  category: "design-tools",
  tags: ["design-token", "css", "variables", "design-system"],
  icon: "palette",
  runtime: "simple",
  featured: false
};

export default manifest;
