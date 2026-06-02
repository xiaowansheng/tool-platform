"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type PowerPreference = "default" | "low-power" | "high-performance";

interface GpuDeviceLike {
  destroy?: () => void;
  label?: string;
}

interface GpuAdapterLike {
  name?: string;
  features?: Iterable<string>;
  limits?: Record<string, number | undefined>;
  isFallbackAdapter?: boolean;
  requestDevice?: (descriptor?: unknown) => Promise<GpuDeviceLike>;
}

interface NavigatorWithGpu extends Navigator {
  gpu?: {
    requestAdapter(options?: { powerPreference?: "low-power" | "high-performance" }): Promise<GpuAdapterLike | null>;
    getPreferredCanvasFormat?: () => string;
    wgslLanguageFeatures?: Iterable<string>;
  };
}

interface GpuReport {
  supported: boolean;
  powerPreference: PowerPreference;
  adapterName: string;
  fallback: boolean | "unknown";
  preferredCanvasFormat: string;
  features: string[];
  limits: Array<{ name: string; value: number | string }>;
  deviceCreated: boolean;
  generatedAt: string;
}

const limitKeys = [
  "maxTextureDimension1D",
  "maxTextureDimension2D",
  "maxTextureDimension3D",
  "maxTextureArrayLayers",
  "maxBindGroups",
  "maxBindingsPerBindGroup",
  "maxBufferSize",
  "maxStorageBufferBindingSize",
  "maxUniformBufferBindingSize",
  "maxComputeWorkgroupStorageSize",
  "maxComputeInvocationsPerWorkgroup",
  "maxComputeWorkgroupSizeX",
  "maxComputeWorkgroupSizeY",
  "maxComputeWorkgroupSizeZ"
];

function emptyReport(powerPreference: PowerPreference): GpuReport {
  return {
    supported: false,
    powerPreference,
    adapterName: "-",
    fallback: "unknown",
    preferredCanvasFormat: "-",
    features: [],
    limits: [],
    deviceCreated: false,
    generatedAt: new Date().toISOString()
  };
}

function collectLimits(adapter: GpuAdapterLike) {
  const limits = adapter.limits ?? {};

  return limitKeys.map((name) => ({
    name,
    value: limits[name] ?? "-"
  }));
}

export default function WebgpuCapabilityReporterTool({ manifest }: ToolAppProps) {
  const [powerPreference, setPowerPreference] = useState<PowerPreference>("default");
  const [requestDevice, setRequestDevice] = useState(true);
  const [report, setReport] = useState<GpuReport>(() => emptyReport("default"));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const reportJson = useMemo(() => JSON.stringify(report, null, 2), [report]);

  async function queryAdapter() {
    setBusy(true);
    setError("");
    setCopied(false);

    const gpu = (navigator as NavigatorWithGpu).gpu;

    if (!gpu) {
      setReport(emptyReport(powerPreference));
      setError("当前浏览器未暴露 navigator.gpu。Chrome/Edge 通常需要 HTTPS 或 localhost。");
      setBusy(false);
      return;
    }

    try {
      const adapter = await gpu.requestAdapter(
        powerPreference === "default" ? undefined : { powerPreference }
      );

      if (!adapter) {
        setReport(emptyReport(powerPreference));
        setError("WebGPU adapter 获取失败，可能是硬件、驱动或浏览器策略限制。");
        return;
      }

      let deviceCreated = false;

      if (requestDevice && adapter.requestDevice) {
        const device = await adapter.requestDevice();

        deviceCreated = true;
        device.destroy?.();
      }

      setReport({
        supported: true,
        powerPreference,
        adapterName: adapter.name || "(adapter name hidden)",
        fallback: typeof adapter.isFallbackAdapter === "boolean" ? adapter.isFallbackAdapter : "unknown",
        preferredCanvasFormat: gpu.getPreferredCanvasFormat?.() ?? "-",
        features: Array.from(adapter.features ?? []).sort((left, right) => left.localeCompare(right)),
        limits: collectLimits(adapter),
        deviceCreated,
        generatedAt: new Date().toISOString()
      });
    } catch (gpuError) {
      setError(gpuError instanceof Error ? gpuError.message : "WebGPU 查询失败");
    } finally {
      setBusy(false);
    }
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportJson);
      setCopied(true);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">WebGPU</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>电源偏好</span>
          <select value={powerPreference} onChange={(event) => setPowerPreference(event.target.value as PowerPreference)}>
            <option value="default">默认</option>
            <option value="low-power">低功耗</option>
            <option value="high-performance">高性能</option>
          </select>
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={requestDevice} onChange={(event) => setRequestDevice(event.target.checked)} />
          Request device
        </label>
        <button type="button" className="button--primary" onClick={() => void queryAdapter()} disabled={busy}>
          查询 GPU
        </button>
        <button type="button" onClick={() => void copyReport()} disabled={!report.supported}>
          {copied ? "已复制" : "复制报告"}
        </button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>支持状态</h3>
          <p>{report.supported ? "yes" : "no"}</p>
        </article>
        <article className="detail-card">
          <h3>适配器</h3>
          <p>{report.adapterName}</p>
        </article>
        <article className="detail-card">
          <h3>格式</h3>
          <p>{report.preferredCanvasFormat}</p>
        </article>
        <article className="detail-card">
          <h3>特性</h3>
          <p>{report.features.length}</p>
        </article>
        <article className="detail-card">
          <h3>设备</h3>
          <p>{report.deviceCreated ? "created" : "-"}</p>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>限制</span>
              <span>值</span>
            </div>
            {report.limits.map((limit) => (
              <div className="tool-table__row" key={limit.name}>
                <span>{limit.name}</span>
                <span>{limit.value}</span>
              </div>
            ))}
          </div>

          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>特性</span>
              <span>状态</span>
            </div>
            {report.features.map((feature) => (
              <div className="tool-table__row" key={feature}>
                <span>{feature}</span>
                <span>已启用</span>
              </div>
            ))}
            {report.features.length === 0 ? (
              <div className="tool-table__row">
                <span>-</span>
                <span>尚未查询或 adapter 未返回 features</span>
              </div>
            ) : null}
          </div>
        </div>

        <label className="tool-field">
          <span>报告 JSON</span>
          <textarea value={reportJson} readOnly spellCheck={false} />
        </label>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">WebGPU 结果受浏览器版本、HTTPS/localhost、GPU 驱动、系统策略和电源偏好影响；同一设备在不同浏览器中可能返回不同 adapter。</p>
    </section>
  );
}
