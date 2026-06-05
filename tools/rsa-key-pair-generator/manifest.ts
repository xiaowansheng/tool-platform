import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "rsa-key-pair-generator",
  name: "RSA Key Pair Generator",
  description: "生成 RSA 密钥对，支持 2048/3072/4096 位，输出 PEM 格式。",
  category: "security-tools",
  tags: ["rsa", "key-pair", "public-key", "private-key"],
  icon: "key",
  runtime: "simple",
  featured: false
};

export default manifest;
