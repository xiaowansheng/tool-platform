import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "nato-alphabet-converter",
  name: "NATO Alphabet Converter",
  description: "将文本转换为 NATO 音标字母（Alpha, Bravo, Charlie...），用于口语传输和无线电通信。",
  category: "text-tools",
  subCategory: "encoding",
  tags: ["nato", "phonetic", "alphabet", "radio", "military"],
  icon: "radio",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"]
};

export default manifest;
