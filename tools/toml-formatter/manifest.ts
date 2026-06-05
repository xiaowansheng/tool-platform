import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "toml-formatter",
  name: "TOML Formatter",
  description: "TOML 格式校验、格式化与压缩，支持标准 TOML v1.0。",
  category: "data-tools",
  tags: ["toml", "formatter", "validator"],
  icon: "file-code",
  runtime: "simple",
  featured: false
};

export default manifest;
