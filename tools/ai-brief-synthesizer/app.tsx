"use client";

import { useMemo, useRef, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk, AiSettingsPanel, getSavedAiConfig, resolveAiConfig } from "@tool-platform/tool-browser-sdk";

const sampleText = `人工智能在医疗领域的应用正在快速发展。近年来，深度学习技术在医学影像识别方面取得了重大突破，能够辅助医生进行更精准的诊断。同时，自然语言处理技术也被广泛应用于电子病历分析和临床决策支持系统中。然而，AI在医疗领域的应用仍面临数据隐私、模型可解释性和监管合规等挑战。专家建议，未来应加强跨学科合作，建立更完善的AI医疗应用评估标准 and 安全框架，确保技术进步能够真正惠及患者。`;

function extractKeyPoints(text: string): string[] {
  const sentences = text
    .split(/[。！？\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return [];

  const points: string[] = [];
  const keywords = ["突破", "发展", "应用", "挑战", "建议", "重要", "关键", "核心", "趋势", "未来"];

  for (const sentence of sentences) {
    const score = keywords.reduce((acc, kw) => acc + (sentence.includes(kw) ? 1 : 0), 0);
    if (score > 0 || sentences.length <= 5) {
      points.push(sentence);
    }
  }

  return points.length > 0 ? points : sentences.slice(0, 3);
}

function generateSummary(text: string): string {
  const sentences = text
    .split(/[。！？\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return "";
  if (sentences.length <= 2) return text;

  return sentences.slice(0, 2).join("。") + "。";
}

function generateConclusion(text: string): string {
  const sentences = text
    .split(/[。！？\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return "";
  return sentences[sentences.length - 1] || "";
}

type BriefMode = "summary" | "key-points" | "conclusion" | "full";

function getSystemPrompt() {
  return "你是一个专业的文本分析和简报提炼助手。请根据用户的指示，准确、客观、精炼地对输入文本进行摘要、要点提取和结论生成。";
}

function getUserPrompt(text: string, mode: BriefMode, maxPoints: number): string {
  switch (mode) {
    case "summary":
      return `请将以下文本提炼为一段简明扼要的摘要（控制在三句话内）：\n\n${text}`;
    case "key-points":
      return `请从以下文本中提取最核心的要点（最多 ${maxPoints} 个），每条要点单独一行，使用数字列表（如 1., 2.）格式，不要有任何前言或总结性废话：\n\n${text}`;
    case "conclusion":
      return `请分析以下文本，提炼出其最终的核心结论或关键建议（控制在一句话内）：\n\n${text}`;
    case "full":
      return `请分析以下文本，并严格按照以下格式生成一份结构化的简报：
【摘要】
[精炼的摘要，控制在两三句话内]

【要点】
1. [要点1]
2. [要点2]
... (最多提取 ${maxPoints} 个要点)

【结论】
[核心结论或建议，控制在一句话内]

待提炼文本如下：
${text}`;
  }
}

export default function AiBriefSynthesizerTool({ manifest }: ToolAppProps) {
  const sdkRef = useRef<ReturnType<typeof createToolSdk> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  if (!sdkRef.current) {
    sdkRef.current = createToolSdk();
  }

  const [config, setConfig] = useState(() => getSavedAiConfig());
  const resolvedConfig = useMemo(() => resolveAiConfig(config), [config]);
  const aiRuntime = useMemo(() => sdkRef.current!.createConfiguredAiRuntime(config), [config]);

  const [input, setInput] = useState(sampleText);
  const [engine, setEngine] = useState<"local" | "ai">("local");
  const [mode, setMode] = useState<BriefMode>("full");
  const [aiResult, setAiResult] = useState("");
  const [copied, setCopied] = useState("");
  const [maxPoints, setMaxPoints] = useState(5);
  const [status, setStatus] = useState("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function getLocalResult(): string {
    if (!input.trim()) return "";

    switch (mode) {
      case "summary":
        return generateSummary(input);
      case "key-points":
        return extractKeyPoints(input)
          .slice(0, maxPoints)
          .map((p, i) => `${i + 1}. ${p}`)
          .join("\n");
      case "conclusion":
        return generateConclusion(input);
      case "full": {
        const summary = generateSummary(input);
        const points = extractKeyPoints(input)
          .slice(0, maxPoints)
          .map((p, i) => `  ${i + 1}. ${p}`)
          .join("\n");
        const conclusion = generateConclusion(input);
        return `【摘要】\n${summary}\n\n【要点】\n${points}\n\n【结论】\n${conclusion}`;
      }
    }
  }

  const result = engine === "local" ? getLocalResult() : aiResult;
  const wordCount = input.replace(/\s/g, "").length;
  const resultWordCount = result.replace(/\s/g, "").length;
  const compressionRatio = wordCount > 0 ? Math.round((1 - resultWordCount / wordCount) * 100) : 0;

  async function handleSynthesize() {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setAiResult("");
    setBusy(true);
    setError("");
    setStatus("connecting");

    try {
      let currentResult = "";
      for await (const chunk of aiRuntime.streamChat(
        resolvedConfig.modelId,
        [
          { role: "system", content: getSystemPrompt() },
          { role: "user", content: getUserPrompt(trimmed, mode, maxPoints) }
        ],
        {
          signal: abortController.signal,
          maxTokens: 1000
        }
      )) {
        if (chunk.type === "status") {
          setStatus(chunk.value);
        }

        if (chunk.type === "token") {
          currentResult += chunk.value;
          setAiResult(currentResult);
        }

        if (chunk.type === "done") {
          setStatus("complete");
        }
      }
    } catch (chatError) {
      if (!abortController.signal.aborted) {
        setError(chatError instanceof Error ? chatError.message : "AI 简报提炼失败");
        setStatus("error");
      }
    } finally {
      setBusy(false);
      abortControllerRef.current = null;
    }
  }

  function stopSynthesize() {
    abortControllerRef.current?.abort();
    setBusy(false);
    setStatus("stopped");
  }

  async function handleCopy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本智能</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {engine === "ai" && <AiSettingsPanel onSave={setConfig} />}

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>提炼引擎</span>
          <select value={engine} onChange={(e) => {
            setEngine(e.target.value as "local" | "ai");
            setError("");
          }}>
            <option value="local">本地规则 (快速)</option>
            <option value="ai">AI 语言模型 (精准)</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>输出模式</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as BriefMode)}>
            <option value="full">完整简报</option>
            <option value="summary">仅摘要</option>
            <option value="key-points">仅要点</option>
            <option value="conclusion">仅结论</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>最大要点数</span>
          <input
            type="number"
            min={1}
            max={20}
            value={maxPoints}
            onChange={(e) => setMaxPoints(Number(e.target.value))}
          />
        </label>
        {engine === "ai" && (
          <>
            <button type="button" onClick={() => void handleSynthesize()} disabled={busy || !input.trim()}>
              开始提炼
            </button>
            <button type="button" onClick={stopSynthesize} disabled={!busy}>
              停止
            </button>
          </>
        )}
        <button type="button" onClick={() => void handleCopy("result", result)} disabled={!result}>
          {copied === "result" ? "已复制" : "复制结果"}
        </button>
        <button type="button" onClick={() => { setInput(sampleText); setAiResult(""); setError(""); setCopied(""); }}>重置示例</button>
        <button type="button" onClick={() => { setInput(""); setAiResult(""); setError(""); setCopied(""); }}>清空</button>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>原始文本</span>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setCopied(""); }}
            spellCheck={false}
            rows={14}
            placeholder="粘贴需要提炼的长文本…"
          />
        </label>
        <label className="tool-field">
          <span>简报输出</span>
          <textarea value={result} readOnly spellCheck={false} rows={14} />
        </label>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>提炼引擎</h3>
          <p>{engine === "local" ? "本地规则" : "AI 模型"}</p>
        </article>
        {engine === "ai" && (
          <article className="detail-card">
            <h3>当前模型</h3>
            <p style={{ wordBreak: "break-all" }}>{resolvedConfig.fallback ? "local-text-sim (远端配置未完成，已回退)" : config.modelId}</p>
          </article>
        )}
        {engine === "ai" && (
          <article className="detail-card">
            <h3>生成状态</h3>
            <p>{status === "connecting" ? "连接中..." : status === "streaming" ? "生成中..." : status === "complete" ? "已完成" : status === "stopped" ? "已停止" : status === "error" ? "失败" : "空闲"}</p>
          </article>
        )}
        <article className="detail-card">
          <h3>输入字数</h3>
          <p>{wordCount.toLocaleString()}</p>
        </article>
        <article className="detail-card">
          <h3>输出字数</h3>
          <p>{resultWordCount.toLocaleString()}</p>
        </article>
        <article className="detail-card">
          <h3>压缩率</h3>
          <p>{compressionRatio}%</p>
        </article>
      </div>

      <p className="tool-note">
        {engine === "local"
          ? "当前为本地规则提取，基于关键词评分和句子位置策略。可以切换到 AI 语言模型以开启高精度语义理解。"
          : "已开启 AI 语言模型提炼，结果由真实 LLM API 生成，支持流式输出。"}
      </p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}

