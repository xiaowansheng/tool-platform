"use client";

import { useMemo, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

function expandIPv6(addr: string): string {
  let clean = addr.trim();
  if (clean.startsWith("::")) clean = "0" + clean;
  if (clean.endsWith("::")) clean = clean + "0";
  const parts = clean.split(":");
  const expanded: string[] = [];
  let inserted = false;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "") {
      if (!inserted) {
        const zeros = 8 - (parts.length - 1);
        for (let j = 0; j < zeros; j++) expanded.push("0000");
        inserted = true;
      }
    } else {
      expanded.push(parts[i].padStart(4, "0"));
    }
  }
  return expanded.join(":").toLowerCase();
}

function prefixToMask(bits: number): string {
  const mask = new Array(8).fill("0000");
  for (let i = 0; i < 8; i++) {
    const bitStart = i * 16;
    const bitEnd = Math.min(bitStart + 16, bits);
    const ones = Math.max(0, bitEnd - bitStart);
    if (ones > 0) {
      mask[i] = (0xFFFF << (16 - ones) & 0xFFFF).toString(16).padStart(4, "0");
    }
  }
  return mask.join(":");
}

export default function Ipv6SubnetCalculatorTool({ manifest }: ToolAppProps) {
  const [network, setNetwork] = useState("2001:db8::");
  const [prefix, setPrefix] = useState(32);

  const result = useMemo(() => {
    try {
      const expanded = expandIPv6(network);
      if (prefix < 0 || prefix > 128) return { error: "前缀长度应在 0-128 之间" };
      const mask = prefixToMask(prefix);
      const expandedMask = expandIPv6(mask);
      const netParts = expanded.split(":");
      const maskParts = expandedMask.split(":");
      const networkAddr = netParts.map((p, i) => {
        const np = parseInt(p, 16);
        const mp = parseInt(maskParts[i], 16);
        return (np & mp).toString(16).padStart(4, "0");
      }).join(":");
      const totalHosts = prefix >= 128 ? 1 : Math.pow(2, 128 - prefix);
      return {
        expanded,
        mask: expandedMask,
        networkAddr,
        totalHosts: totalHosts >= 1e12 ? `${(totalHosts / 1e12).toFixed(2)}T` :
          totalHosts >= 1e9 ? `${(totalHosts / 1e9).toFixed(2)}B` :
          totalHosts >= 1e6 ? `${(totalHosts / 1e6).toFixed(2)}M` :
          totalHosts >= 1e3 ? `${(totalHosts / 1e3).toFixed(2)}K` :
          String(totalHosts),
        prefix,
        error: null,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "计算失败" };
    }
  }, [network, prefix]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">网络计算</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>网络地址</span>
          <input value={network} onChange={e => setNetwork(e.target.value)} placeholder="2001:db8::" />
        </label>
        <label className="tool-field tool-field--compact">
          <span>前缀长度</span>
          <input type="number" value={prefix} onChange={e => setPrefix(Math.min(128, Math.max(0, Number(e.target.value))))} min={0} max={128} style={{ width: 80 }} />
        </label>
      </div>
      {result.error ? <p className="tool-error">{result.error}</p> : (
        <div className="detail-grid">
          <article className="detail-card"><h3>展开地址</h3><p className="mono-output" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{result.expanded}</p></article>
          <article className="detail-card"><h3>子网掩码</h3><p className="mono-output" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{result.mask}</p></article>
          <article className="detail-card"><h3>网络地址</h3><p className="mono-output" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{result.networkAddr}/{result.prefix}</p></article>
          <article className="detail-card"><h3>地址总数</h3><p>{result.totalHosts}</p></article>
        </div>
      )}
      <p className="tool-note">IPv6 计算器，支持缩写展开和任意前缀长度（0-128）。</p>
    </section>
  );
}
