import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "converter-studio",
  name: "Converter Studio",
  description: "一站式代码与数据转换工坊，支持 YAML/JSON/TOML、CSV/JSON/NDJSON、JSON 转 TS/Go/SQL、SQL 转 Go Struct、SVG 转 JSX、Markdown 互转 HTML 以及 htaccess 转 Nginx 重写规则。",
  category: "developer-tools",
  subCategory: "convert",
  tags: [
    "json",
    "yaml",
    "toml",
    "properties",
    "csv",
    "ndjson",
    "typescript",
    "go",
    "sql",
    "svg",
    "jsx",
    "markdown",
    "html",
    "htaccess",
    "nginx"
  ],
  icon: "code",
  runtime: "sandbox",
  isolation: "iframe",
  sandbox: true,
  featured: true,
  permissions: []
};

export default manifest;
