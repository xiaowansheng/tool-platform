import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "api-key-generator",
  name: "API Key Generator",
  description: "生成多种格式的 API 密钥，支持自定义前缀、熵值与哈希后缀。",
  category: "security-tools",
  tags: ["api-key", "generator", "token", "auth"],
  icon: "key-round",
  runtime: "simple",
  featured: false
};

export default manifest;
