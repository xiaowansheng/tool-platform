import type { ToolManifest } from "@tool-platform/tool-contracts";

import { getToolAppLoader, type ToolAppLoader } from "./client";

export const DEFAULT_REMOTE_IFRAME_SANDBOX = "allow-scripts allow-forms allow-popups allow-downloads";

export type LocalToolMicroFrontendAdapter = {
  kind: "local";
  loader: ToolAppLoader;
};

export type IframeToolMicroFrontendAdapter = {
  kind: "iframe";
  url: string;
  sandbox: string;
  allow?: string;
  title?: string;
};

export type MissingToolMicroFrontendAdapter = {
  kind: "missing";
  reason: "local-loader-not-found" | "iframe-url-missing" | "remote-adapter-missing";
};

export type ToolMicroFrontendAdapter =
  | LocalToolMicroFrontendAdapter
  | IframeToolMicroFrontendAdapter
  | MissingToolMicroFrontendAdapter;

export function resolveToolMicroFrontendAdapter(manifest: ToolManifest): ToolMicroFrontendAdapter {
  if (manifest.microFrontend?.kind === "iframe") {
    if (!manifest.microFrontend.url) {
      return { kind: "missing", reason: "iframe-url-missing" };
    }

    return {
      kind: "iframe",
      url: manifest.microFrontend.url,
      sandbox: manifest.microFrontend.sandbox ?? DEFAULT_REMOTE_IFRAME_SANDBOX,
      allow: manifest.microFrontend.allow,
      title: manifest.microFrontend.title
    };
  }

  if (manifest.runtime === "remote") {
    return { kind: "missing", reason: "remote-adapter-missing" };
  }

  const loader = getToolAppLoader(manifest.id);

  if (!loader) {
    return { kind: "missing", reason: "local-loader-not-found" };
  }

  return {
    kind: "local",
    loader
  };
}
