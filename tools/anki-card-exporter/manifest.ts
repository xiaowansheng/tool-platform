import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "anki-card-exporter",
  name: "Anki Card Exporter",
  description: "生成 Anki 导入用的 APKG 卡片包，支持 Markdown 转卡片。",
  category: "learning-tools",
  tags: ["anki", "flashcard", "spaced-repetition"],
  icon: "notebook",
  runtime: "simple",
  featured: false
};

export default manifest;
