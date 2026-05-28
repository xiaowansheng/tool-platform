import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "resource-unit-converter",
  name: "Resource Unit Converter",
  description: "换算 Kubernetes CPU、内存和存储单位，生成 requests/limits 参考值。",
  category: "ops-tools",
  subCategory: "kubernetes",
  tags: ["kubernetes", "cpu", "memory", "storage"],
  icon: "cpu",
  runtime: "simple",
  featured: false
};

export default manifest;
