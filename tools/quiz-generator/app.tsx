"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type QuizType = "choice" | "cloze" | "qa";
function keywords(text: string) { return [...new Set((text.match(/[\p{L}\p{N}]{3,}/gu) ?? []).map((word) => word.toLowerCase()))].slice(0, 20); }

export default function QuizGeneratorTool({ manifest }: ToolAppProps) {
  const [source, setSource] = useState("Content Security Policy helps reduce cross-site scripting risk by limiting which scripts, styles, images, and frames a browser can load.");
  const [count, setCount] = useState(5);
  const [type, setType] = useState<QuizType>("choice");
  const quiz = useMemo(() => {
    const sentences = source.split(/[.!?。！？]+/).map((item) => item.trim()).filter(Boolean);
    const terms = keywords(source);
    return Array.from({ length: Math.min(count, Math.max(1, sentences.length || terms.length)) }, (_, index) => {
      const sentence = sentences[index % Math.max(1, sentences.length)] ?? source;
      const answer = terms[index % Math.max(1, terms.length)] ?? "key concept";
      if (type === "cloze") return `${index + 1}. 填空：${sentence.replace(new RegExp(answer, "i"), "____")}\n答案：${answer}`;
      if (type === "qa") return `${index + 1}. 问答：请解释“${answer}”在材料中的作用。\n参考答案：${sentence}`;
      const options = [answer, ...terms.filter((term) => term !== answer).slice(index, index + 3)];
      return `${index + 1}. 选择：以下哪个关键词最贴近这句话？\n${sentence}\n${options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join("\n")}\n答案：A`;
    }).join("\n\n");
  }, [count, source, type]);
  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Learning</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid"><label className="tool-field tool-field--compact"><span>题型</span><select value={type} onChange={(event) => setType(event.target.value as QuizType)}><option value="choice">选择题</option><option value="cloze">填空题</option><option value="qa">问答题</option></select></label><label className="tool-field tool-field--compact"><span>题目数量</span><input type="number" min="1" max="20" value={count} onChange={(event) => setCount(Number(event.target.value))} /></label></div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>学习材料</span><textarea value={source} onChange={(event) => setSource(event.target.value)} rows={14} /></label><label className="tool-field"><span>生成题目</span><textarea value={quiz} readOnly rows={14} /></label></div>
    </section>
  );
}
