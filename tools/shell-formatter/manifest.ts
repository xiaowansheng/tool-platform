import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "shell-formatter",
  name: "Shell Formatter",
  description: "Shell 脚本格式化与 lint，支持 bash/sh/zsh 风格。",
  category: "ops-tools",
  tags: ["shell", "bash", "formatter", "shfmt"],
  icon: "terminal-square",
  runtime: "simple",
  featured: false
};

export default manifest;
