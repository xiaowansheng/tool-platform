"use client";

import { useMemo, useRef, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

type Role = "system" | "user" | "assistant";

interface ChatMessage {
  id: number;
  role: Role;
  content: string;
}

const sampleMessages: ChatMessage[] = [
  {
    id: 1,
    role: "assistant",
    content: "我可以帮你把工具想法拆成可实现的输入、处理、输出和校验路径。"
  }
];

function estimateTokens(input: string) {
  const asciiWords = input.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  const cjkChars = input.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const symbols = input.replace(/[A-Za-z0-9_\s\u3400-\u9fff]/g, "").length;

  return Math.max(1, Math.ceil(asciiWords * 1.3 + cjkChars * 0.9 + symbols * 0.5));
}

function transcript(systemPrompt: string, messages: ChatMessage[]) {
  return [
    `System: ${systemPrompt}`,
    ...messages.map((message) => `${message.role}: ${message.content}`)
  ].join("\n\n");
}

export default function AiChatTool({ manifest }: ToolAppProps) {
  const sdkRef = useRef<ReturnType<typeof createToolSdk> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  if (!sdkRef.current) {
    sdkRef.current = createToolSdk();
  }

  const aiRuntime = useMemo(() => sdkRef.current!.createAiRuntime(), []);
  const [systemPrompt, setSystemPrompt] = useState("你是浏览器工具平台中一位简洁的产品工程助手。");
  const [input, setInput] = useState("帮我把一个新开发者工具拆成核心功能、输入输出和测试点。");
  const [messages, setMessages] = useState<ChatMessage[]>(sampleMessages);
  const [status, setStatus] = useState("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nextIdRef = useRef(10);

  const tokenCount = estimateTokens(transcript(systemPrompt, messages) + input);

  async function sendMessage() {
    const trimmed = input.trim();

    if (!trimmed) {
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMessage: ChatMessage = { id: nextIdRef.current++, role: "user", content: trimmed };
    const assistantMessage: ChatMessage = { id: nextIdRef.current++, role: "assistant", content: "" };
    const nextMessages = [...messages, userMessage, assistantMessage];
    let assistantContent = "";

    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    setError("");

    try {
      for await (const chunk of aiRuntime.streamChat(
        "local-text-sim",
        [
          { role: "system", content: systemPrompt },
          ...messages.map((message) => ({ role: message.role, content: message.content })),
          { role: "user", content: trimmed }
        ],
        {
          signal: abortController.signal,
          maxTokens: 180
        }
      )) {
        if (chunk.type === "status") {
          setStatus(chunk.value);
        }

        if (chunk.type === "token") {
          assistantContent += chunk.value;
          setMessages((current) => current.map((message) => (
            message.id === assistantMessage.id ? { ...message, content: assistantContent } : message
          )));
        }

        if (chunk.type === "done") {
          setStatus("complete");
        }
      }
    } catch (chatError) {
      if (!abortController.signal.aborted) {
        setError(chatError instanceof Error ? chatError.message : "AI Chat 生成失败");
        setStatus("error");
      }
    } finally {
      setBusy(false);
      abortControllerRef.current = null;
    }
  }

  function stopMessage() {
    abortControllerRef.current?.abort();
    setBusy(false);
    setStatus("stopped");
  }

  async function copyTranscript() {
    await navigator.clipboard.writeText(transcript(systemPrompt, messages));
  }

  function resetChat() {
    abortControllerRef.current?.abort();
    setMessages(sampleMessages);
    setStatus("idle");
    setError("");
    setBusy(false);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">AI 运行时</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => void sendMessage()} disabled={busy || !input.trim()}>
          发送
        </button>
        <button type="button" onClick={stopMessage} disabled={!busy}>
          停止
        </button>
        <button type="button" onClick={() => void copyTranscript()}>
          复制会话
        </button>
        <button type="button" onClick={resetChat}>
          重置
        </button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>状态</h3>
          <p>{status}</p>
        </article>
        <article className="detail-card">
          <h3>消息数</h3>
          <p>{messages.length}</p>
        </article>
        <article className="detail-card">
          <h3>Token 估算</h3>
          <p>{tokenCount}</p>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>系统提示词</span>
            <textarea value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>消息</span>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              spellCheck={false}
            />
          </label>
        </div>

        <div className="chat-transcript" aria-label="AI 聊天记录">
          {messages.map((message) => (
            <article key={message.id} className={`chat-message chat-message--${message.role}`}>
              <p className="eyebrow">{message.role}</p>
              <p>{message.content || (message.role === "assistant" && busy ? "..." : "")}</p>
            </article>
          ))}
        </div>
      </div>

      <p className="tool-note">当前接入平台内置 local-text-sim runtime，用于验证 AI 工具交互；后续可替换为真实模型提供方。</p>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
