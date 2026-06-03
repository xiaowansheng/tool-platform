import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "paper-size-reference",
  name: "纸张尺寸查询",
  description: "查询 A、B、C 系列及常见印刷品纸张尺寸（mm/inch/px），支持 DPI 换算。",
  category: "design-tools",
  subCategory: "layout",
  tags: ["paper", "size", "a4", "dpi", "print", "印刷"],
  icon: "file",
  runtime: "simple",
  featured: false
};

export default manifest;
