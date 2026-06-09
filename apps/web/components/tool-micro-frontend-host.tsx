"use client";

import { Component, lazy, Suspense, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import {
  resolveToolMicroFrontendAdapter,
  type ToolMicroFrontendAdapter
} from "@tool-platform/tool-sdk/micro-frontend";
import type { ToolManifest } from "@tool-platform/tool-sdk";

type ToolAppLocation = {
  path: string;
  segments: string[];
};

type HostLabels = {
  loadError: string;
  loadErrorTitle: string;
  loading: string;
  loadingTitle: string;
  renderError: string;
  renderErrorTitle: string;
  retry: string;
  missingLocal: string;
  missingRemoteUrl: string;
  remoteEyebrow: string;
  remoteDescription: string;
};

function ToolMicroFrontendFallback({
  eyebrow,
  manifest,
  message
}: {
  eyebrow: string;
  manifest: ToolManifest;
  message: string;
}) {
  return (
    <section className="tool-panel tool-panel--micro-frontend">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{message}</p>
      </div>
    </section>
  );
}

function ToolLoadingPanel({
  inline = false,
  manifest,
  message,
  title
}: {
  inline?: boolean;
  manifest: ToolManifest;
  message: string;
  title: string;
}) {
  const content = (
    <div className="tool-panel__header">
      <div>
        <p className="eyebrow">{title}</p>
        <h2>{manifest.name}</h2>
      </div>
      <p>{message}</p>
    </div>
  );

  if (inline) {
    return <div className="tool-micro-frontend-state">{content}</div>;
  }

  return <section className="tool-panel tool-panel--micro-frontend">{content}</section>;
}

class ToolMicroFrontendErrorBoundary extends Component<
  {
    children: ReactNode;
    labels: HostLabels;
    manifest: ToolManifest;
    resetKey: string;
  },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Tool micro frontend failed: " + this.props.manifest.id, error, errorInfo);
  }

  componentDidUpdate(previousProps: { resetKey: string }) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <section className="tool-panel tool-panel--micro-frontend">
          <div className="tool-panel__header">
            <div>
              <p className="eyebrow">{this.props.labels.renderErrorTitle}</p>
              <h2>{this.props.manifest.name}</h2>
            </div>
            <p>{this.props.labels.renderError}</p>
          </div>
          <p className="tool-error">{this.state.error.message}</p>
          <div className="tool-toolbar">
            <button type="button" onClick={() => this.setState({ error: null })}>
              {this.props.labels.retry}
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

function buildRemoteToolUrl(url: string, manifest: ToolManifest, locale: string, location: ToolAppLocation) {
  const remoteUrl = new URL(url, window.location.href);

  remoteUrl.searchParams.set("toolId", manifest.id);
  remoteUrl.searchParams.set("locale", locale);
  remoteUrl.searchParams.set("path", location.path);

  if (location.segments.length > 0) {
    remoteUrl.searchParams.set("segments", location.segments.join("/"));
  }

  return remoteUrl.toString();
}

function LocalToolMicroFrontend({
  adapter,
  labels,
  locale,
  location,
  manifest
}: {
  adapter: Extract<ToolMicroFrontendAdapter, { kind: "local" }>;
  labels: HostLabels;
  locale: string;
  location: ToolAppLocation;
  manifest: ToolManifest;
}) {
  const ToolComponent = useMemo(
    () =>
      lazy(async () => {
        const module = await adapter.loader();
        return { default: module.default };
      }),
    [adapter]
  );
  const resetKey = manifest.id + ":" + location.path;

  return (
    <ToolMicroFrontendErrorBoundary labels={labels} manifest={manifest} resetKey={resetKey}>
      <Suspense fallback={<ToolLoadingPanel manifest={manifest} message={labels.loading} title={labels.loadingTitle} />}>
        <ToolComponent manifest={manifest} locale={locale} path={location.path} segments={location.segments} />
      </Suspense>
    </ToolMicroFrontendErrorBoundary>
  );
}

function RemoteIframeToolMicroFrontend({
  adapter,
  labels,
  locale,
  location,
  manifest
}: {
  adapter: Extract<ToolMicroFrontendAdapter, { kind: "iframe" }>;
  labels: HostLabels;
  locale: string;
  location: ToolAppLocation;
  manifest: ToolManifest;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    setSrc(buildRemoteToolUrl(adapter.url, manifest, locale, location));
  }, [adapter.url, locale, location, manifest]);

  return (
    <section className="tool-panel tool-panel--micro-frontend tool-panel--remote">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">{labels.remoteEyebrow}</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{labels.remoteDescription}</p>
      </div>
      {src ? (
        <iframe
          allow={adapter.allow}
          className="tool-micro-frontend-frame"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox={adapter.sandbox}
          src={src}
          title={adapter.title ?? manifest.name}
        />
      ) : (
        <ToolLoadingPanel inline manifest={manifest} message={labels.loading} title={labels.loadingTitle} />
      )}
    </section>
  );
}

export function ToolMicroFrontendHost({
  locale,
  location,
  manifest
}: {
  locale: string;
  location: ToolAppLocation;
  manifest: ToolManifest;
}) {
  const t = useTranslations("toolLoader");
  const labels: HostLabels = {
    loadError: t("loadError"),
    loadErrorTitle: t("loadErrorTitle"),
    loading: t("loading"),
    loadingTitle: t("loadingTitle"),
    renderError: t("renderError"),
    renderErrorTitle: t("renderErrorTitle"),
    retry: t("retry"),
    missingLocal: t("missingLocal"),
    missingRemoteUrl: t("missingRemoteUrl"),
    remoteEyebrow: t("remoteEyebrow"),
    remoteDescription: t("remoteDescription")
  };
  const adapter = useMemo(() => resolveToolMicroFrontendAdapter(manifest), [manifest]);

  if (adapter.kind === "missing") {
    const message = adapter.reason === "local-loader-not-found" ? labels.missingLocal : labels.missingRemoteUrl;
    return <ToolMicroFrontendFallback eyebrow={labels.loadErrorTitle} manifest={manifest} message={message || labels.loadError} />;
  }

  if (adapter.kind === "iframe") {
    return (
      <RemoteIframeToolMicroFrontend
        adapter={adapter}
        labels={labels}
        locale={locale}
        location={location}
        manifest={manifest}
      />
    );
  }

  return (
    <LocalToolMicroFrontend adapter={adapter} labels={labels} locale={locale} location={location} manifest={manifest} />
  );
}
