"use client";

import { useRef } from "react";

import { createToolSdk, useToolRuntime } from "@tool-platform/tool-browser-sdk";
import type { ToolManifest } from "@tool-platform/tool-sdk";

export function ToolRuntimeCard({ manifest }: { manifest: ToolManifest }) {
  const sdkRef = useRef<ReturnType<typeof createToolSdk> | null>(null);

  if (!sdkRef.current) {
    sdkRef.current = createToolSdk();
  }

  const sdk = sdkRef.current;
  const runtime = useToolRuntime(manifest.id);

  if (manifest.runtime === "simple") {
    return null;
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Runtime Control</p>
          <h2>{manifest.runtime} session</h2>
        </div>
        <p>第二阶段把工具从静态页面推进到可管理的 runtime 生命周期。</p>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>Status</h3>
          <p>{runtime.status}</p>
        </article>
        <article className="detail-card">
          <h3>Memory Limit</h3>
          <p>{manifest.memoryLimit ? `${manifest.memoryLimit} MB` : "not set"}</p>
        </article>
        <article className="detail-card">
          <h3>Permissions</h3>
          <p>{manifest.permissions?.join(" / ") ?? "none"}</p>
        </article>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void sdk.restartTool(manifest.id)}>
          Restart Runtime
        </button>
        <button type="button" onClick={() => void sdk.closeTool(manifest.id)}>
          Close Runtime
        </button>
      </div>
      {runtime.error ? <p className="tool-error">{runtime.error}</p> : null}
    </section>
  );
}
