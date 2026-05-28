"use client";

import { lazy, Suspense, useMemo } from "react";
import { useTranslations } from "next-intl";

import { loadToolComponent } from "@tool-platform/tool-sdk/client";
import type { ToolClientProps, ToolManifest } from "@tool-platform/tool-sdk";

function MissingTool({ manifest }: ToolClientProps) {
  const t = useTranslations("toolLoader");
  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Load Error</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{t("loadError")}</p>
      </div>
    </section>
  );
}

function ToolLoadingPanel({ manifest }: { manifest: ToolManifest }) {
  const t = useTranslations("toolLoader");
  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Loading</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{t("loading")}</p>
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
