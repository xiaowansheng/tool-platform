import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "age-calculator",
  name: "年龄计算器",
  description: "根据出生日期精确计算年龄（年/月/日），并显示距离下一个生日的倒计时",
  category: "calculator-tools",
  subCategory: "date-time",
  tags: ["age", "birthday", "date", "calculator", "countdown"],
  icon: "gift",
  runtime: "simple",
  featured: false
};

export default manifest;
