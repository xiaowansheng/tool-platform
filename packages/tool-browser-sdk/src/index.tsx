"use client";

import { useEffect, useState } from "react";

import {
  createAiRuntime as createAiRuntimeCore,
  createLocalTextModelProvider,
  createOpenAiCompatibleProvider,
  createGeminiProvider
} from "@tool-platform/ai-runtime";
import { createToolRuntimeManager, type ToolRuntimeFactory, type ToolRuntimeSnapshot } from "@tool-platform/runtime";
import {
  DEFAULT_IFRAME_SANDBOX,
  IframeSandboxClient,
  createIframeSandboxClient,
  createSandboxDocument
} from "@tool-platform/sandbox-runtime";
import {
  deleteOpfsFile,
  isOpfsSupported,
  listOpfsEntries,
  readOpfsText,
  writeOpfsJson,
  writeOpfsText
} from "@tool-platform/storage";
import { clearWasmCache, loadWasm, preloadWasm } from "@tool-platform/wasm-runtime";
import {
  createInlineWorker,
  createWorkerClient,
  WorkerClient,
  WorkerToolRuntime,
  type InlineWorkerHandle
} from "@tool-platform/worker-runtime";

export interface ToolToast {
  id: string;
  title: string;
  description?: string;
  tone?: "info" | "success" | "error";
}

const toolRuntimeManager = createToolRuntimeManager();
const toastState: ToolToast[] = [];
const toastListeners = new Set<(toasts: ToolToast[]) => void>();

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

function emitToastUpdate() {
  const snapshot = [...toastState];

  for (const listener of toastListeners) {
    listener(snapshot);
  }
}

export function subscribeToToolToasts(listener: (toasts: ToolToast[]) => void) {
  toastListeners.add(listener);
  listener([...toastState]);

  return () => {
    toastListeners.delete(listener);
  };
}

export function pushToolToast(input: Omit<ToolToast, "id"> & { id?: string }) {
  const toast = {
    ...input,
    id: input.id ?? createId("toast")
  };

  toastState.unshift(toast);
  emitToastUpdate();
  return toast.id;
}

export function dismissToolToast(id: string) {
  const next = toastState.filter((toast) => toast.id !== id);

  toastState.splice(0, toastState.length, ...next);
  emitToastUpdate();
}

export function useToolToasts() {
  const [toasts, setToasts] = useState<ToolToast[]>([...toastState]);

  useEffect(() => subscribeToToolToasts(setToasts), []);
  return toasts;
}

export function useToolRuntime(toolId: string) {
  const [snapshot, setSnapshot] = useState<ToolRuntimeSnapshot>(() => toolRuntimeManager.getSnapshot(toolId));

  useEffect(() => {
    setSnapshot(toolRuntimeManager.getSnapshot(toolId));

    return toolRuntimeManager.subscribe((nextSnapshot) => {
      if (nextSnapshot.toolId === toolId) {
        setSnapshot(nextSnapshot);
      }
    });
  }, [toolId]);

  return snapshot;
}

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
}

function download(filename: string, contents: Blob | string, type = "text/plain;charset=utf-8") {
  const blob = contents instanceof Blob ? contents : new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function share(data: ShareData) {
  if (!navigator.share) {
    throw new Error("Web Share API is not supported in this browser");
  }

  await navigator.share(data);
}

async function openTextFile(accept = ".txt,.md,.json,.csv") {
  return new Promise<{ name: string; text: string }>((resolve, reject) => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];

      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      resolve({
        name: file.name,
        text: await file.text()
      });
    };
    input.click();
  });
}

export function createToolSdk() {
  return {
    copy,
    download,
    share,
    openTextFile,
    saveTextFile: download,
    cacheText: writeOpfsText,
    cacheJson: writeOpfsJson,
    readCachedText: readOpfsText,
    listCachedEntries: listOpfsEntries,
    deleteCachedFile: deleteOpfsFile,
    isOpfsSupported,
    registerRuntime(toolId: string, factory: ToolRuntimeFactory) {
      return toolRuntimeManager.registerTool(toolId, factory);
    },
    unregisterRuntime(toolId: string) {
      return toolRuntimeManager.unregisterTool(toolId);
    },
    openTool(toolId: string) {
      return toolRuntimeManager.openTool(toolId);
    },
    closeTool(toolId: string) {
      return toolRuntimeManager.closeTool(toolId);
    },
    restartTool(toolId: string) {
      return toolRuntimeManager.restartTool(toolId);
    },
    suspendTool(toolId: string) {
      return toolRuntimeManager.suspendTool(toolId);
    },
    getRuntimeSnapshot(toolId: string) {
      return toolRuntimeManager.getSnapshot(toolId);
    },
    subscribeRuntime(listener: (snapshot: ToolRuntimeSnapshot) => void) {
      return toolRuntimeManager.subscribe(listener);
    },
    toast(input: Omit<ToolToast, "id"> & { id?: string }) {
      return pushToolToast(input);
    },
    dismissToast(id: string) {
      dismissToolToast(id);
    },
    createWorkerClient,
    createInlineWorker,
    createWorkerRuntime(handleFactory: () => InlineWorkerHandle) {
      return new WorkerToolRuntime(handleFactory);
    },
    createAiRuntime(provider = createLocalTextModelProvider()) {
      return createAiRuntimeCore(provider);
    },
    createConfiguredAiRuntime(config = getSavedAiConfig()) {
      const resolved = resolveAiConfig(config);

      if (resolved.provider === "openai") {
        return createAiRuntimeCore(
          createOpenAiCompatibleProvider({
            apiKey: resolved.apiKey,
            baseUrl: resolved.baseUrl,
            modelId: resolved.modelId,
            temperature: resolved.temperature
          })
        );
      }

      if (resolved.provider === "gemini") {
        return createAiRuntimeCore(
          createGeminiProvider({
            apiKey: resolved.apiKey,
            modelId: resolved.modelId,
            temperature: resolved.temperature
          })
        );
      }

      return createAiRuntimeCore(createLocalTextModelProvider());
    },
    createSandboxDocument,
    createIframeSandboxClient,
    loadWasm,
    preloadWasm,
    clearWasmCache
  };
}

export interface AiConfig {
  provider: "local-sim" | "openai" | "gemini";
  apiKey: string;
  baseUrl: string;
  modelId: string;
  temperature?: number;
}

export interface ResolvedAiConfig extends AiConfig {
  fallback: boolean;
}

export function getSavedAiConfig(): AiConfig {
  if (typeof window === "undefined") {
    return { provider: "local-sim", apiKey: "", baseUrl: "", modelId: "local-text-sim" };
  }
  try {
    const saved = localStorage.getItem("tool-platform-ai-config");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // ignore
  }
  return { provider: "local-sim", apiKey: "", baseUrl: "", modelId: "local-text-sim" };
}

export function saveAiConfig(config: AiConfig) {
  if (typeof window !== "undefined") {
    localStorage.setItem("tool-platform-ai-config", JSON.stringify(config));
  }
}

export function resolveAiConfig(config: AiConfig): ResolvedAiConfig {
  if (config.provider === "openai" && config.apiKey && config.baseUrl && config.modelId) {
    return { ...config, fallback: false };
  }

  if (config.provider === "gemini" && config.apiKey && config.modelId) {
    return { ...config, fallback: false };
  }

  return {
    provider: "local-sim",
    apiKey: "",
    baseUrl: "",
    modelId: "local-text-sim",
    temperature: config.temperature,
    fallback: config.provider !== "local-sim"
  };
}

export function AiSettingsPanel({ onSave }: { onSave?: (config: AiConfig) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<AiConfig>(() => getSavedAiConfig());
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    saveAiConfig(config);
    if (onSave) {
      onSave(config);
    }
    pushToolToast({
      title: "配置已保存",
      description: "AI 模型配置已成功更新并缓存到本地。",
      tone: "success"
    });
  };

  const handleProviderChange = (provider: AiConfig["provider"]) => {
    let defaultModel = "local-text-sim";
    let defaultBaseUrl = "";
    if (provider === "openai") {
      defaultModel = "gpt-4o-mini";
      defaultBaseUrl = "https://api.openai.com/v1";
    } else if (provider === "gemini") {
      defaultModel = "gemini-1.5-flash";
      defaultBaseUrl = "";
    }
    setConfig({
      ...config,
      provider,
      modelId: defaultModel,
      baseUrl: defaultBaseUrl
    });
  };

  return (
    <div style={{
      border: "1px solid var(--border-color, #e5e7eb)",
      borderRadius: "12px",
      padding: "16px",
      marginBottom: "24px",
      backgroundColor: "var(--bg-card, #f9fafb)",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setIsOpen(!isOpen)}>
        <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
          ⚙️ AI 模型配置
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #6b7280)", fontWeight: "normal" }}>
            ({config.provider === "local-sim" ? "本地模拟器" : config.provider === "openai" ? `OpenAI: ${config.modelId}` : `Gemini: ${config.modelId}`})
          </span>
        </h3>
        <button type="button" style={{ padding: "4px 8px", fontSize: "0.85rem", border: "1px solid var(--border-color)", borderRadius: "6px", background: "none", cursor: "pointer" }}>
          {isOpen ? "收起" : "展开配置"}
        </button>
      </div>

      {isOpen && (
        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <label className="tool-field">
            <span>服务商 (Provider)</span>
            <select
              value={config.provider}
              onChange={(e) => handleProviderChange(e.target.value as AiConfig["provider"])}
            >
              <option value="local-sim">本地文本模拟器 (无需 API Key)</option>
              <option value="openai">OpenAI 兼容接口 (如 DeepSeek, OpenAI, Qwen 等)</option>
              <option value="gemini">Google Gemini API</option>
            </select>
          </label>

          {config.provider !== "local-sim" && (
            <>
              {config.provider === "openai" && (
                <label className="tool-field">
                  <span>接口地址 (Base URL)</span>
                  <input
                    type="text"
                    value={config.baseUrl}
                    onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                  />
                </label>
              )}

              <label className="tool-field">
                <span>模型 ID (Model ID)</span>
                <input
                  type="text"
                  value={config.modelId}
                  onChange={(e) => setConfig({ ...config, modelId: e.target.value })}
                  placeholder={config.provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash"}
                />
              </label>

              <label className="tool-field">
                <span>API Key</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type={showKey ? "text" : "password"}
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="输入你的 API Key"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    style={{ padding: "0 12px", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: "pointer", background: "none" }}
                  >
                    {showKey ? "隐藏" : "显示"}
                  </button>
                </div>
              </label>
            </>
          )}

          <label className="tool-field">
            <span>温度 (Temperature): {config.temperature ?? 0.7}</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature ?? 0.7}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: "8px 16px",
                backgroundColor: "var(--primary-color, #3b82f6)",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              保存配置
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { WorkerClient, WorkerToolRuntime, createInlineWorker, createWorkerClient };
export { DEFAULT_IFRAME_SANDBOX, IframeSandboxClient, createIframeSandboxClient, createSandboxDocument };

