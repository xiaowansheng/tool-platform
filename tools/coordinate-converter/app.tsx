"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type CoordSystem = "WGS84" | "GCJ02" | "BD09";

const PI = Math.PI;
const EE = 0.00669342162296594323;
const A = 6378245.0;

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

function outOfChina(lng: number, lat: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
  return [lng + dLng, lat + dLat];
}

function gcj02ToWgs84(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];
  const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat);
  const dLng = gcjLng - lng;
  const dLat = gcjLat - lat;
  return [lng - dLng, lat - dLat];
}

function gcj02ToBd09(lng: number, lat: number): [number, number] {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * PI * 3000.0 / 180.0);
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * PI * 3000.0 / 180.0);
  return [z * Math.cos(theta) + 0.0065, z * Math.sin(theta) + 0.006];
}

function bd09ToGcj02(lng: number, lat: number): [number, number] {
  const x = lng - 0.0065;
  const y = lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * PI * 3000.0 / 180.0);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * PI * 3000.0 / 180.0);
  return [z * Math.cos(theta), z * Math.sin(theta)];
}

function convert(lng: number, lat: number, from: CoordSystem, to: CoordSystem): [number, number] {
  if (from === to) return [lng, lat];

  // Convert to GCJ02 first
  let gcjLng: number, gcjLat: number;
  if (from === "WGS84") {
    [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat);
  } else if (from === "BD09") {
    [gcjLng, gcjLat] = bd09ToGcj02(lng, lat);
  } else {
    [gcjLng, gcjLat] = [lng, lat];
  }

  // Convert from GCJ02 to target
  if (to === "WGS84") {
    return gcj02ToWgs84(gcjLng, gcjLat);
  } else if (to === "BD09") {
    return gcj02ToBd09(gcjLng, gcjLat);
  }
  return [gcjLng, gcjLat];
}

const systemLabels: Record<CoordSystem, string> = {
  WGS84: "WGS-84（GPS 原始）",
  GCJ02: "GCJ-02（国测局/高德）",
  BD09: "BD-09（百度）"
};

interface CoordResult {
  from: CoordSystem;
  to: CoordSystem;
  lng: number;
  lat: number;
}

export default function CoordinateConverterTool({ manifest }: ToolAppProps) {
  const [lngStr, setLngStr] = useState("116.397428");
  const [latStr, setLatStr] = useState("39.90923");
  const [from, setFrom] = useState<CoordSystem>("WGS84");
  const [results, setResults] = useState<CoordResult[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  function handleConvert() {
    setError("");
    setResults([]);
    setCopied(null);

    const lng = parseFloat(lngStr);
    const lat = parseFloat(latStr);

    if (isNaN(lng) || isNaN(lat)) { setError("请输入有效的经纬度数值"); return; }
    if (lng < -180 || lng > 180) { setError("经度范围 -180 ~ 180"); return; }
    if (lat < -90 || lat > 90) { setError("纬度范围 -90 ~ 90"); return; }

    const allSystems: CoordSystem[] = ["WGS84", "GCJ02", "BD09"];
    const newResults: CoordResult[] = [];

    for (const target of allSystems) {
      if (target === from) continue;
      const [rLng, rLat] = convert(lng, lat, from, target);
      newResults.push({ from, to: target, lng: rLng, lat: rLat });
    }

    setResults(newResults);
  }

  async function handleCopy(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">GPS 坐标</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>经度 (Lng)</span>
          <input value={lngStr} onChange={(e) => setLngStr(e.target.value)} placeholder="116.397428" spellCheck={false} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>纬度 (Lat)</span>
          <input value={latStr} onChange={(e) => setLatStr(e.target.value)} placeholder="39.90923" spellCheck={false} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>源坐标系</span>
          <select value={from} onChange={(e) => setFrom(e.target.value as CoordSystem)}>
            {Object.entries(systemLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={handleConvert}>转换</button>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}

      {results.length > 0 ? (
        <div className="case-grid">
          {results.map((r) => {
            const key = `${r.to}`;
            const coordText = `${r.lng.toFixed(6)}, ${r.lat.toFixed(6)}`;
            return (
              <article key={key} className="detail-card">
                <div className="tool-card__header">
                  <div>
                    <p className="eyebrow">{systemLabels[r.to]}</p>
                    <h3>{r.to}</h3>
                  </div>
                  <button type="button" onClick={() => void handleCopy(key, coordText)}>
                    {copied === key ? "已复制" : "复制"}
                  </button>
                </div>
                <p className="mono-output">Lng: {r.lng.toFixed(6)}</p>
                <p className="mono-output">Lat: {r.lat.toFixed(6)}</p>
              </article>
            );
          })}
        </div>
      ) : null}

      <p className="tool-note">
        WGS-84 为 GPS 原始坐标；GCJ-02 为国测局加密坐标（高德、腾讯地图使用）；BD-09 为百度地图二次加密坐标。
        中国境外坐标 WGS-84 ↔ GCJ-02 不做偏移。
      </p>
    </section>
  );
}
