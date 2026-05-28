import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "flashcard-cloze-builder",
  name: "Flashcard Cloze Builder",
  description: "从学习笔记生成问答卡、填空卡和 Anki TSV，支持关键词标记、难度和复习提示。",
  category: "learning-tools",
  subCategory: "study",
  tags: ["flashcard", "anki", "cloze", "study", "learning"],
  icon: "graduation-cap",
  runtime: "simple",
  featured: false,
  permissions: ["clipboard"],
  capabilities: ["flashcard-generate", "cloze-deletion", "anki-tsv"]
};

export default manifest;
