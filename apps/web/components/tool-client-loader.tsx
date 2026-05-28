"use client";

import { lazy, Suspense, useMemo } from "react";

import { loadToolComponent } from "@tool-platform/tool-sdk/client";
import type { ToolClientProps, ToolManifest } from "@tool-platform/tool-sdk";

function MissingTool({ manifest }: ToolClientProps) {
  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Load Error</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>工具组件未注册或无法加载。</p>
      </div>
    </section>
  );
}

function ToolLoadingPanel({ manifest }: { manifest: ToolManifest }) {
  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Loading</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>工具组件加载中。</p>
      </div>
    </section>
  );
}

export function ToolClientLoader({ manifest }: { manifest: ToolManifest }) {
  const ToolComponent = useMemo(
    () =>
      lazy(async () => ({
        default: (await loadToolComponent(manifest.id)) ?? MissingTool
      })),
    [manifest.id]
  );

  return (
    <Suspense fallback={<ToolLoadingPanel manifest={manifest} />}>
      <ToolComponent manifest={manifest} />
    </Suspense>
  );
}
