"use client";

import { useEffect, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface NetInfo {
  connectionType: string | null;
  downlink: number | null;
  downlinkMax: number | null;
  rtt: number | null;
  saveData: boolean | null;
  effectiveType: string | null;
}

export default function NetworkConnectionInfoTool({ manifest }: ToolAppProps) {
  const [info, setInfo] = useState<NetInfo>({
    connectionType: null, downlink: null, downlinkMax: null,
    rtt: null, saveData: null, effectiveType: null,
  });

  function update() {
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn) {
      setInfo({
        connectionType: conn.type ?? null,
        downlink: conn.downlink ?? null,
        downlinkMax: conn.downlinkMax ?? null,
        rtt: conn.rtt ?? null,
        saveData: conn.saveData ?? null,
        effectiveType: conn.effectiveType ?? null,
      });
    }
  }

  useEffect(() => {
    update();
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    conn?.addEventListener("change", update);
    return () => conn?.removeEventListener("change", update);
  }, []);

  const bars = info.effectiveType === "4g" ? 4 : info.effectiveType === "3g" ? 3 : info.effectiveType === "2g" ? 2 : info.effectiveType === "slow-2g" ? 1 : 0;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">网络诊断</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>连接类型</h3><p>{info.connectionType ?? "N/A"}</p></article>
        <article className="detail-card"><h3>有效类型</h3><p>{info.effectiveType ?? "N/A"}{bars > 0 ? ` (${"▮".repeat(bars)}${"▯".repeat(4 - bars)})` : ""}</p></article>
        <article className="detail-card"><h3>下行速度</h3><p>{info.downlink != null ? `${info.downlink} Mbps` : "N/A"}</p></article>
        <article className="detail-card"><h3>最大下行</h3><p>{info.downlinkMax != null ? `${info.downlinkMax} Mbps` : "N/A"}</p></article>
        <article className="detail-card"><h3>RTT</h3><p>{info.rtt != null ? `${info.rtt} ms` : "N/A"}</p></article>
        <article className="detail-card"><h3>省流模式</h3><p>{info.saveData != null ? (info.saveData ? "开启" : "关闭") : "N/A"}</p></article>
      </div>
      <p className="tool-note">基于 Network Information API，部分浏览器可能不支持或返回有限数据。</p>
    </section>
  );
}
