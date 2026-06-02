import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "email-template-sandbox-preview",
  name: "Email Template Sandbox Preview",
  description: "编辑 HTML 邮件模板并在沙盒 iframe 中实时预览渲染效果，支持变量替换和响应式预览。",
  category: "developer-tools",
  subCategory: "email",
  tags: ["email", "html", "template", "preview", "sandbox", "mjml"],
  icon: "mail",
  runtime: "sandbox",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
