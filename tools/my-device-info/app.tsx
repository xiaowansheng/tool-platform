"use client";

import { useEffect, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface IpGeo {
  ip: string;
  country: string;
  countryCode: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  mobile: boolean;
  proxy: boolean;
  hosting: boolean;
}

interface BrowserInfo {
  userAgent: string;
  platform: string;
  language: string;
  languages: string;
  cookiesEnabled: boolean;
  doNotTrack: boolean;
  online: boolean;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  colorDepth: number;
  hardwareConcurrency: number;
  maxTouchPoints: number;
  vendor: string;
}

function getBrowserInfo(): BrowserInfo {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages.join(", "),
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === "1",
    online: navigator.onLine,
    screenWidth: screen.width,
    screenHeight: screen.height,
    devicePixelRatio: window.devicePixelRatio,
    colorDepth: screen.colorDepth,
    hardwareConcurrency: navigator.hardwareConcurrency ?? 0,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    vendor: navigator.vendor ?? "",
  };
}

function parseBrowser(ua: string): { browser: string; os: string; engine: string } {
  let browser = "Unknown";
  let os = "Unknown";
  let engine = "Unknown";

  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("CrOS")) os = "Chrome OS";

  if (ua.includes("Gecko/")) engine = "Gecko";
  if (ua.includes("like Gecko")) engine = "Gecko-like";
  if (ua.includes("AppleWebKit/")) engine = "WebKit";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) engine = "Blink";

  return { browser, os, engine };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return <button type="button" className="button--small" onClick={copy} style={{ marginLeft: 8 }}>{copied ? "已复制" : "复制"}</button>;
}

export default function MyDeviceInfoTool({ manifest }: ToolAppProps) {
  const [geo, setGeo] = useState<IpGeo | null>(null);
  const [geoError, setGeoError] = useState("");
  const [browser] = useState(getBrowserInfo);
  const parsed = parseBrowser(browser.userAgent);

  useEffect(() => {
    fetch("https://api.techniknews.net/ipgeo/")
      .then(r => r.json())
      .then(data => {
        if (data.status === "fail") setGeoError(data.message ?? "查询失败");
        else setGeo(data);
      })
      .catch(e => setGeoError(e instanceof Error ? e.message : "IP 查询失败"));
  }, []);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">设备信息</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>公网 IP</h3>
          <p className="mono-output">{geo?.ip ?? "检测中..."}</p>
          {geo && <CopyButton text={geo.ip} />}
        </article>
        <article className="detail-card">
          <h3>地理位置</h3>
          <p>{geo ? `${geo.country} (${geo.countryCode}) · ${geo.regionName} · ${geo.city}` : "检测中..."}</p>
        </article>
        <article className="detail-card">
          <h3>坐标</h3>
          <p>{geo ? `${geo.lat}, ${geo.lon}` : "检测中..."}</p>
        </article>
        <article className="detail-card">
          <h3>时区</h3>
          <p>{geo?.timezone ?? "检测中..."}</p>
        </article>
        <article className="detail-card">
          <h3>ISP</h3>
          <p>{geo?.isp ?? "检测中..."}</p>
        </article>
        <article className="detail-card">
          <h3>组织 / AS</h3>
          <p>{geo ? `${geo.org} · ${geo.as}` : "检测中..."}</p>
        </article>
        <article className="detail-card">
          <h3>网络特征</h3>
          <p>{geo ? `移动网络: ${geo.mobile ? "是" : "否"} · 代理: ${geo.proxy ? "是" : "否"} · 托管: ${geo.hosting ? "是" : "否"}` : "检测中..."}</p>
        </article>
        <article className="detail-card">
          <h3>浏览器</h3>
          <p>{parsed.browser} ({parsed.engine})</p>
        </article>
        <article className="detail-card">
          <h3>操作系统</h3>
          <p>{parsed.os}</p>
        </article>
        <article className="detail-card">
          <h3>屏幕</h3>
          <p>{browser.screenWidth} x {browser.screenHeight} @ {browser.devicePixelRatio}x · {browser.colorDepth}bit</p>
        </article>
        <article className="detail-card">
          <h3>CPU 核心</h3>
          <p>{browser.hardwareConcurrency || "N/A"}</p>
        </article>
        <article className="detail-card">
          <h3>触控支持</h3>
          <p>{browser.maxTouchPoints > 0 ? `${browser.maxTouchPoints} 触点` : "无触控"}</p>
        </article>
        <article className="detail-card">
          <h3>语言</h3>
          <p>{browser.language}</p>
        </article>
        <article className="detail-card">
          <h3>网络状态</h3>
          <p>{browser.online ? "在线" : "离线"}</p>
        </article>
      </div>

      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontSize: "0.85rem", color: "var(--text-muted)" }}>原始 User-Agent</summary>
        <p className="mono-output" style={{ fontSize: "0.75rem", wordBreak: "break-all", marginTop: 6 }}>
          {browser.userAgent}
          <CopyButton text={browser.userAgent} />
        </p>
      </details>

      {geoError && <p className="tool-error">{geoError}</p>}
    </section>
  );
}
