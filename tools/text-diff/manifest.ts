import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "text-diff",
  name: "Text Diff",
  description: "对比两段文本，生成行级差异和变更统计。",
  category: "文本工具",
  subCategory: "diff",
  tags: ["diff", "compare", "text", "review"],
  icon: "diff",
  runtime: "simple",
  featured: false
};

export default manifest;
