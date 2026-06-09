"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function normalizeHex(value: string) {
  const hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex)) return "#" + hex.split("").map((char) => char + char).join("");
  if (/^[0-9a-f]{6}$/i.test(hex)) return "#" + hex;
  return "#000000";
}

function rgb(hex: string) {
  const normalized = normalizeHex(hex).slice(1);
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
}

function channel(value: number) {
  const next = value / 255;
  return next <= 0.03928 ? next / 12.92 : Math.pow((next + 0.055) / 1.055, 2.4);
}

function luminance(hex: string) {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r ?? 0) + 0.7152 * channel(g ?? 0) + 0.0722 * channel(b ?? 0);
}

function contrastRatio(foreground: string, background: string) {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function verdict(ratio: number) {
  return {
    aaText: ratio >= 4.5,
    aaaText: ratio >= 7,
    aaLarge: ratio >= 3,
    aaaLarge: ratio >= 4.5
  };
}

export default function WcagContrastCheckerTool({ manifest }: ToolAppProps) {
  const [foreground, setForeground] = useState("#111827");
  const [background, setBackground] = useState("#f9fafb");
  const ratio = useMemo(() => contrastRatio(foreground, background), [background, foreground]);
  const result = verdict(ratio);
  const fg = normalizeHex(foreground);
  const bg = normalizeHex(background);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Accessibility</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar"><label className="tool-field tool-field--compact"><span>Text</span><input type="color" value={fg} onChange={(event) => setForeground(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>Text HEX</span><input value={foreground} onChange={(event) => setForeground(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>Background</span><input type="color" value={bg} onChange={(event) => setBackground(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>Background HEX</span><input value={background} onChange={(event) => setBackground(event.target.value)} /></label></div>
      <div className="detail-card" style={{ background: bg, color: fg, borderColor: "var(--border-subtle)" }}><h2>Readable interface text</h2><p>This preview uses the selected foreground and background colors at normal paragraph size.</p><button type="button" style={{ color: fg, borderColor: fg }}>Action</button></div>
      <div className="detail-grid"><article className="detail-card"><h3>Ratio</h3><p>{ratio.toFixed(2)}:1</p></article><article className="detail-card"><h3>AA normal</h3><p>{result.aaText ? "pass" : "fail"}</p></article><article className="detail-card"><h3>AAA normal</h3><p>{result.aaaText ? "pass" : "fail"}</p></article><article className="detail-card"><h3>AA large</h3><p>{result.aaLarge ? "pass" : "fail"}</p></article><article className="detail-card"><h3>AAA large</h3><p>{result.aaaLarge ? "pass" : "fail"}</p></article></div>
    </section>
  );
}
