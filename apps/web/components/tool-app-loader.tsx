"use client";

import { ComponentType, lazy, Suspense, useMemo } from "react";
import { useTranslations } from "next-intl";

import { usePathname } from "@/i18n/navigation";
import { loadToolApp } from "@tool-platform/tool-sdk/client";
import type { ToolAppProps, ToolManifest } from "@tool-platform/tool-sdk";

function normalizePathname(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function stripLocalePrefix(pathname: string, locale: string) {
  const normalizedPathname = normalizePathname(pathname);
  const localePrefix = `/${locale}`;

  if (normalizedPathname === localePrefix) {
    return "/";
  }

  if (normalizedPathname.startsWith(`${localePrefix}/`)) {
    return normalizedPathname.slice(localePrefix.length);
  }

  return normalizedPathname;
}

function getToolAppLocation(pathname: string, locale: string, toolId: string) {
  const normalizedPathname = stripLocalePrefix(pathname, locale);
  const toolRootPath = `/tools/${toolId}`;

  if (normalizedPathname === toolRootPath) {
    return {
      path: toolRootPath,
      segments: []
    };
  }

  if (normalizedPathname.startsWith(`${toolRootPath}/`)) {
    return {
      path: normalizedPathname,
      segments: normalizedPathname.slice(toolRootPath.length + 1).split("/").filter(Boolean)
    };
  }

  return {
    path: toolRootPath,
    segments: []
  };
}

function MissingTool({ manifest }: ToolAppProps) {
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

export function ToolAppLoader({ manifest, locale }: { manifest: ToolManifest; locale: string }) {
  const pathname = usePathname();
  const appLocation = useMemo(() => getToolAppLocation(pathname, locale, manifest.id), [pathname, locale, manifest.id]);
  const ToolComponent = useMemo(
    () =>
      lazy(async () => {
        const comp = await loadToolApp(manifest.id);
        return {
          default: (comp as ComponentType<ToolAppProps>) ?? MissingTool
        };
      }),
    [manifest.id]
  );

  return (
    <Suspense fallback={<ToolLoadingPanel manifest={manifest} />}>
      <ToolComponent manifest={manifest} locale={locale} path={appLocation.path} segments={appLocation.segments} />
    </Suspense>
  );
}
