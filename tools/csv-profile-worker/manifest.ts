import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "csv-profile-worker",
  name: "CSV Profile Worker",
  description: "解析 CSV 文件并生成数据画像，包括列类型推断、空值统计、唯一值计数和分布概览。",
  category: "data-tools",
  subCategory: "analysis",
  tags: ["csv", "profile", "analysis", "data", "statistics", "column"],
  icon: "table",
  runtime: "worker",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
