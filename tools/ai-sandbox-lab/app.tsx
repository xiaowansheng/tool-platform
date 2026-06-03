"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";
import {
  DEFAULT_IFRAME_SANDBOX,
  createToolSdk,
  useToolRuntime,
  type IframeSandboxClient,
  AiSettingsPanel,
  getSavedAiConfig,
  resolveAiConfig
} from "@tool-platform/tool-browser-sdk";

export default function AiSandboxLabTool({ manifest }: ToolAppProps) {
  const sdkRef = useRef<ReturnType<typeof createToolSdk> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sandboxClientRef = useRef<IframeSandboxClient | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  if (!sdkRef.current) {
    sdkRef.current = createToolSdk();
  }

  const sdk = sdkRef.current;
  const runtime = useToolRuntime(manifest.id);
  const [config, setConfig] = useState(() => getSavedAiConfig());
  const resolvedConfig = useMemo(() => resolveAiConfig(config), [config]);
  const aiRuntime = useMemo(() => sdk.createConfiguredAiRuntime(config), [sdk, config]);
  const sandboxDocument = useMemo(
    () =>
      sdk.createSandboxDocument({
        title: "AI Sandbox Preview",
        accentColor: "#5eead4"
      }),
    [sdk]
  );
  const [systemPrompt, setSystemPrompt] = useState("Respond as a concise tool operator. Keep the output scoped and practical.");
  const [prompt, setPrompt] = useState("Design the next AI tool runtime milestone for a browser tool platform.");
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState("idle");
  const [embedding, setEmbedding] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sdk.registerRuntime(manifest.id, () => ({
      init() {
        setStatus("loading-model");
      },
      mount() {
        setStatus("model-ready");
      },
      activate() {
        setStatus("active");
      },
      suspend() {
        abortControllerRef.current?.abort();
        setStatus("suspended");
      },
      destroy() {
        abortControllerRef.current?.abort();
        setStatus("destroyed");
      }
    }));

    void sdk.openTool(manifest.id);

    return () => {
      abortControllerRef.current?.abort();
      sandboxClientRef.current?.dispose();
      void sdk.closeTool(manifest.id);
      void sdk.unregisterRuntime(manifest.id);
    };
  }, [manifest.id, sdk]);

  async function renderSandbox(nextResponse = response) {
    if (!sandboxClientRef.current) {
      return;
    }

    await sandboxClientRef.current.call("renderPreview", {
      title: "AI Sandbox Preview",
      prompt,
      response: nextResponse
    });
  }

  function handleSandboxLoad() {
    sandboxClientRef.current?.dispose();

    if (!iframeRef.current) {
      return;
    }

    sandboxClientRef.current = sdk.createIframeSandboxClient(iframeRef.current);
    void renderSandbox();
  }

  async function handleGenerate() {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let nextResponse = "";

    setBusy(true);
    setError("");
    setResponse("");
    setEmbedding([]);

    try {
      await sdk.openTool(manifest.id);

      for await (const chunk of aiRuntime.streamChat(
        resolvedConfig.modelId,
        [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
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
          nextResponse += chunk.value;
          setResponse(nextResponse);
        }

        if (chunk.type === "done") {
          setStatus("complete");
        }
      }

      try {
        const vector = await aiRuntime.embed(resolvedConfig.modelId, `${systemPrompt}\n${prompt}`, {
          signal: abortController.signal
        });
        setEmbedding(vector.slice(0, 8));
      } catch (embedError) {
        console.warn("Embedding not supported by this model provider:", embedError);
      }
      await renderSandbox(nextResponse);
      sdk.toast({
        tone: "success",
        title: "AI stream completed",
        description: "The sandbox preview has been updated."
      });
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "AI generation failed");
      setStatus("error");
    } finally {
      setBusy(false);
      abortControllerRef.current = null;
    }
  }

  async function handleCopy() {
    try {
      await sdk.copy(response);
      sdk.toast({
        tone: "success",
        title: "Copied response"
      });
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Failed to copy response");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">AI 运行时 + iframe 沙箱</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <AiSettingsPanel onSave={setConfig} />

      <div className="tool-toolbar">
        <button type="button" onClick={handleGenerate} disabled={busy}>
          生成
        </button>
        <button type="button" onClick={() => abortControllerRef.current?.abort()} disabled={!busy}>
          停止
        </button>
        <button type="button" onClick={handleCopy} disabled={!response}>
          复制
        </button>
        <button type="button" onClick={() => void renderSandbox()} disabled={!sandboxClientRef.current}>
          刷新预览
        </button>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>系统</span>
            <textarea value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} spellCheck={false} />
          </label>
          <label className="tool-field">
            <span>提示词</span>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} spellCheck={false} />
          </label>
          <div className="tool-results">
            <div>
              <p className="eyebrow">运行时</p>
              <strong>{runtime.status}</strong>
            </div>
            <div>
              <p className="eyebrow">模型</p>
              <strong>{status}</strong>
            </div>
            <div>
              <p className="eyebrow">配置</p>
              <strong style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>
                {config.provider === "local-sim"
                  ? "本地模拟器"
                  : resolvedConfig.fallback
                    ? "本地模拟器 (远端配置未完成，已回退)"
                    : `${config.provider === "openai" ? "OpenAI兼容" : "Gemini"}: ${config.modelId}`}
              </strong>
            </div>
            <div>
              <p className="eyebrow">沙箱</p>
              <strong>{sandboxClientRef.current ? "ready" : "loading"}</strong>
            </div>
          </div>
        </div>

        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>流式响应</span>
            <textarea value={response} onChange={(event) => setResponse(event.target.value)} spellCheck={false} />
          </label>
          <iframe
            ref={iframeRef}
            className="sandbox-frame"
            sandbox={DEFAULT_IFRAME_SANDBOX}
            srcDoc={sandboxDocument}
            title="AI sandbox preview"
            onLoad={handleSandboxLoad}
          />
        </div>
      </div>

      {embedding.length > 0 ? (
        <div className="tag-list">
          {embedding.map((value, index) => (
            <span key={`${index}-${value}`} className="tag">
              e{index + 1}: {value}
            </span>
          ))}
        </div>
      ) : null}

      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
