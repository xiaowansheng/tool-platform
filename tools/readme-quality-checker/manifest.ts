import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "readme-quality-checker",
  name: "README 质量检查器",
  description: "按项目介绍、安装、使用、配置、许可证等维度评估 README 完整度。",
  category: "办公工具",
  subCategory: "documentation",
  tags: ["readme", "quality", "checklist", "documentation"],
  icon: "clipboard-check",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
