import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "decision-wheel",
  name: "Decision Wheel",
  description: "输入候选项和可选权重，用可复现 seed 随机抽取结果并保留选择历史。",
  category: "娱乐工具",
  subCategory: "random",
  tags: ["random", "decision", "wheel", "picker", "seed"],
  icon: "circle-dot",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["weighted-random", "seeded-result", "history-copy"]
};

export default manifest;
