"use client";

import { useRef, useState } from "react";

import { createToolSdk, useToolRuntime } from "@tool-platform/tool-browser-sdk";
import type { ToolManifest } from "@tool-platform/tool-sdk";

import { getPermissionLabels, getRuntimeLabel, isZhLocale } from "@/lib/tool-page-copy";

function statusClass(status: string) {
  if (status === "initializing" || status === "mounted") return "status-dot--running";
  if (status === "error") return "status-dot--error";
  if (status === "active") return "";
  return "status-dot--idle";
}

export function ToolRuntimeCard({ manifest, locale = "en" }: { manifest: ToolManifest; locale?: string }) {
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

  const isZh = isZhLocale(locale);
  const runtimeLabel = getRuntimeLabel(manifest.runtime, locale);
  const permissionLabels = getPermissionLabels(manifest.permissions, locale);
  const labels = isZh
    ? {
        eyebrow: "运行时控制",
        session: "会话",
        status: "状态",
        memoryLimit: "内存限制",
        permissions: "权限",
        noLimit: "未设置",
        noPermissions: "无需额外权限",
        restart: "重启运行时",
        close: "关闭运行时",
        restartFailed: "运行时重启失败",
        closeFailed: "运行时关闭失败",
        statuses: {
          active: "活跃",
          initializing: "初始化中",
          registered: "已注册",
          mounted: "已挂载",
          suspended: "已暂停",
          closed: "已关闭",
          destroyed: "已销毁",
          error: "异常",
          idle: "空闲",
          unregistered: "未注册"
        }
      }
    : {
        eyebrow: "Runtime Control",
        session: "session",
        status: "Status",
        memoryLimit: "Memory Limit",
        permissions: "Permissions",
        noLimit: "not set",
        noPermissions: "none",
        restart: "Restart Runtime",
        close: "Close Runtime",
        restartFailed: "Failed to restart runtime",
        closeFailed: "Failed to close runtime",
        statuses: {
          active: "active",
          initializing: "initializing",
          registered: "registered",
          mounted: "mounted",
          suspended: "suspended",
          closed: "closed",
          destroyed: "destroyed",
          error: "error",
          idle: "idle",
          unregistered: "unregistered"
        }
      };

  async function restartRuntime() {
    try {
      setControlError("");
      await sdk.restartTool(manifest.id);
    } catch (error) {
      setControlError(error instanceof Error ? error.message : labels.restartFailed);
    }
  }

  async function closeRuntime() {
    try {
      setControlError("");
      await sdk.closeTool(manifest.id);
    } catch (error) {
      setControlError(error instanceof Error ? error.message : labels.closeFailed);
    }
  }

  return (
    <section className="tool-panel tool-panel--runtime">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">{labels.eyebrow}</p>
          <h2>
            {runtimeLabel} {labels.session}
          </h2>
        </div>
        <span className="pill pill--runtime" data-runtime={manifest.runtime}>
          {runtimeLabel}
        </span>
      </div>
      <dl className="detail-grid detail-grid--meta">
        <div className="detail-card detail-card--meta">
          <dt>{labels.status}</dt>
          <dd>
            <span className={`status-dot ${statusClass(runtime.status)}`} />
            {labels.statuses[runtime.status] ?? runtime.status}
          </dd>
        </div>
        <div className="detail-card detail-card--meta">
          <dt>{labels.memoryLimit}</dt>
          <dd>{manifest.memoryLimit ? `${manifest.memoryLimit} MB` : labels.noLimit}</dd>
        </div>
        <div className="detail-card detail-card--meta">
          <dt>{labels.permissions}</dt>
          <dd>{permissionLabels.length > 0 ? permissionLabels.join(" / ") : labels.noPermissions}</dd>
        </div>
      </dl>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void restartRuntime()}>
          {labels.restart}
        </button>
        <button type="button" onClick={() => void closeRuntime()}>
          {labels.close}
        </button>
      </div>
      {controlError ? <p className="tool-error">{controlError}</p> : null}
      {runtime.error ? <p className="tool-error">{runtime.error}</p> : null}
    </section>
  );
}
