import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "naming-convention-converter",
  name: "Naming Convention Converter",
  description: "多种命名风格互转：camelCase、snake_case、kebab-case、PascalCase 等。",
  category: "text-tools",
  tags: ["camelCase", "snake_case", "kebab-case", "PascalCase"],
  icon: "case-sensitive",
  runtime: "simple",
  featured: false
};

export default manifest;
