"use client";

import { useMemo } from "react";

import { usePathname } from "@/i18n/navigation";
import { getToolAppLocation } from "@/lib/tool-app-location";
import type { ToolManifest } from "@tool-platform/tool-sdk";
import { ToolMicroFrontendHost } from "./tool-micro-frontend-host";

export function ToolAppLoader({ manifest, locale }: { manifest: ToolManifest; locale: string }) {
  const pathname = usePathname();
  const appLocation = useMemo(() => getToolAppLocation(pathname, locale, manifest.id), [pathname, locale, manifest.id]);

  return <ToolMicroFrontendHost manifest={manifest} locale={locale} location={appLocation} />;
}
