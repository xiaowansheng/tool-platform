"use client";

import { useRef, useState } from "react";

import { createToolSdk, useToolRuntime } from "@tool-platform/tool-browser-sdk";
import type { ToolManifest } from "@tool-platform/tool-sdk";

function statusClass(status: string) {
  if (status === "initializing" || status === "mounted") return "status-dot--running";
  if (status === "error") return "status-dot--error";
  if (status === "active") return "";
  return "status-dot--idle";
}

export function ToolRuntimeCard({ manifest }: { manifest: ToolManifest }) {
  const sdkRef = useRef<ReturnType<typeof createToolSdk> | null>(null);
  const [controlError, setControlError] = useState("");

  if (!sdkRef.current) {
    sdkRef.current = createToolSdk();
  }

  const sdk = sdkRef.current;
  const runtime = useToolRuntime(manifest.id);

  if (manifest.runtime === "simple" || runtime.status === "unregistered") {
    return null;
  }

  async function restartRuntime() {
    try {
      setControlError("");
      await sdk.restartTool(manifest.id);
    } catch (error) {
      setControlError(error instanceof Error ? error.message : "Failed to restart runtime");
    }
  }

  async function closeRuntime() {
    try {
      setControlError("");
      await sdk.closeTool(manifest.id);
    } catch (error) {
      setControlError(error instanceof Error ? error.message : "Failed to close runtime");
    }
  }

  return (
    <section className="tool-panel tool-panel--runtime">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Runtime Control</p>
          <h2>{manifest.runtime} session</h2>
        </div>
        <span className="pill pill--runtime" data-runtime={manifest.runtime}>
          {manifest.runtime}
        </span>
      </div>
      <dl className="detail-grid detail-grid--meta">
        <div className="detail-card detail-card--meta">
          <dt>Status</dt>
          <dd>
            <span className={`status-dot ${statusClass(runtime.status)}`} />
            {runtime.status}
          </dd>
        </div>
        <div className="detail-card detail-card--meta">
          <dt>Memory Limit</dt>
          <dd>{manifest.memoryLimit ? `${manifest.memoryLimit} MB` : "not set"}</dd>
        </div>
        <div className="detail-card detail-card--meta">
          <dt>Permissions</dt>
          <dd>{manifest.permissions?.join(" / ") ?? "none"}</dd>
        </div>
      </dl>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void restartRuntime()}>
          Restart Runtime
        </button>
        <button type="button" onClick={() => void closeRuntime()}>
          Close Runtime
        </button>
      </div>
      {controlError ? <p className="tool-error">{controlError}</p> : null}
      {runtime.error ? <p className="tool-error">{runtime.error}</p> : null}
    </section>
  );
}
