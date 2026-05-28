import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "cookie-parser",
  name: "Cookie Parser",
  description: "解析 Cookie 与 Set-Cookie，展开属性并诊断 Secure、HttpOnly、SameSite 等 Flags。",
  category: "webmaster-tools",
  subCategory: "http",
  tags: ["cookie", "set-cookie", "httponly", "samesite", "security"],
  icon: "cookie",
  runtime: "simple",
  featured: true
};

export default manifest;
