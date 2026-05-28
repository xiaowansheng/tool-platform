import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "chmod-calculator",
  name: "chmod Calculator",
  description: "用复选框生成 Unix 文件权限数字和符号表示。",
  category: "ops-tools",
  subCategory: "filesystem",
  tags: ["chmod", "unix", "permissions", "ops"],
  icon: "lock-keyhole",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
