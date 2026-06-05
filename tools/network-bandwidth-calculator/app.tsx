"use client";

import { useMemo, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const UNITS = ["bit/s", "Kbit/s", "Mbit/s", "Gbit/s", "byte/s", "KB/s", "MB/s", "GB/s"];

function convertToBitsPerSecond(value: number, unit: string): number {
  const multipliers: Record<string, number> = {
    "bit/s": 1, "Kbit/s": 1e3, "Mbit/s": 1e6, "Gbit/s": 1e9,
    "byte/s": 8, "KB/s": 8e3, "MB/s": 8e6, "GB/s": 8e9,
  };
  return value * (multipliers[unit] ?? 1);
}

function formatBits(bits: number): string {
  if (bits >= 1e9) return (bits / 1e9).toFixed(2) + " Gbit/s";
  if (bits >= 1e6) return (bits / 1e6).toFixed(2) + " Mbit/s";
  if (bits >= 1e3) return (bits / 1e3).toFixed(2) + " Kbit/s";
  return bits.toFixed(2) + " bit/s";
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + " MB";
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + " KB";
  return bytes.toFixed(2) + " B";
}

export default function BandwidthCalculatorTool({ manifest }: ToolAppProps) {
  const [bandwidth, setBandwidth] = useState(100);
  const [bwUnit, setBwUnit] = useState("Mbit/s");
  const [fileSize, setFileSize] = useState(500);
  const [fsUnit, setFsUnit] = useState("MB");

  const bwBits = useMemo(() => convertToBitsPerSecond(bandwidth, bwUnit), [bandwidth, bwUnit]);
  const fileBits = useMemo(() => {
    const mults: Record<string, number> = { B: 8, KB: 8e3, MB: 8e6, GB: 8e9, TB: 8e12 };
    return fileSize * (mults[fsUnit] ?? 8e6);
  }, [fileSize, fsUnit]);

  const transferTime = bwBits > 0 ? fileBits / bwBits : Infinity;
  const days = Math.floor(transferTime / 86400);
  const hours = Math.floor((transferTime % 86400) / 3600);
  const minutes = Math.floor((transferTime % 3600) / 60);
  const seconds = transferTime % 60;

  const timeStr = days > 0 ? `${days}d ${hours}h ${minutes}m ${seconds.toFixed(1)}s` :
    hours > 0 ? `${hours}h ${minutes}m ${seconds.toFixed(1)}s` :
    minutes > 0 ? `${minutes}m ${seconds.toFixed(1)}s` :
    `${seconds.toFixed(2)}s`;

  const maxBw = bwBits > 0 ? formatBits(bwBits) : "N/A";
  const perSecond = bwBits > 0 ? formatBytes(bwBits / 8) + "/s" : "N/A";

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">网络计算</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>带宽</span>
          <input type="number" value={bandwidth} onChange={e => setBandwidth(Number(e.target.value))} min={0} />
        </label>
        <select value={bwUnit} onChange={e => setBwUnit(e.target.value)}>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <label className="tool-field tool-field--compact">
          <span>数据大小</span>
          <input type="number" value={fileSize} onChange={e => setFileSize(Number(e.target.value))} min={0} />
        </label>
        <select value={fsUnit} onChange={e => setFsUnit(e.target.value)}>
          {["B", "KB", "MB", "GB", "TB"].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>带宽</h3><p>{maxBw}</p></article>
        <article className="detail-card"><h3>吞吐量</h3><p>{perSecond}</p></article>
        <article className="detail-card"><h3>文件大小</h3><p>{formatBytes(fileBits / 8)}</p></article>
        <article className="detail-card"><h3>传输时间</h3><p>{timeStr}</p></article>
      </div>
      <p className="tool-note">理论值，实际传输时间受网络延迟、丢包和协议开销影响。</p>
    </section>
  );
}
