"use client";

import { useRef } from "react";

import { createToolSdk, useToolRuntime } from "@tool-platform/tool-browser-sdk";
import type { ToolManifest } from "@tool-platform/tool-sdk";

function statusClass(status: string) {
  if (status === "running") return "status-dot--running";
  if (status === "error") return "status-dot--error";
  return "status-dot--idle";
}

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
        <span className="pill pill--runtime" data-runtime={manifest.runtime}>
          {manifest.runtime}
        </span>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>Status</h3>
          <p>
            <span className={`status-dot ${statusClass(runtime.status)}`} />
            {runtime.status}
          </p>
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
