import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "webhook-signature-verifier",
  name: "Webhook Signature Verifier",
  description: "本地验证 GitHub、Stripe、Slack Webhook HMAC 签名。",
  category: "security-tools",
  subCategory: "security",
  tags: ["webhook", "github", "stripe", "slack", "hmac"],
  icon: "webhook",
  runtime: "simple",
  featured: true
};

export default manifest;
