import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "pii-detector",
  name: "PII Detector",
  description: "本地检测文本中的邮箱、电话、身份证明、银行卡、地址和网络标识符。",
  category: "developer",
  subCategory: "privacy",
  tags: ["pii", "privacy", "redaction", "data", "scanner"],
  icon: "scan-eye",
  runtime: "simple",
  featured: false
};

export default manifest;
