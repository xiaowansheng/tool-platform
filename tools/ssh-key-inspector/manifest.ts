import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "ssh-key-inspector",
  name: "SSH Key Inspector",
  description: "解析 SSH 公钥信息：算法、指纹、注释与位长。",
  category: "security-tools",
  tags: ["ssh", "key", "fingerprint", "public-key"],
  icon: "terminal",
  runtime: "simple",
  featured: false
};

export default manifest;
