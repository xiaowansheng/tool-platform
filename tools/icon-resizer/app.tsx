"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const defaultSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
  '  <rect width="64" height="64" rx="14" fill="#2563eb"/>',
  '  <path d="M18 34l10 10 18-24" fill="none" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>',
  '</svg>'
].join("\n");

function svgDataUrl(svg: string) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function resizedSvg(svg: string, size: number) {
  const source = svg.includes("<svg") ? svg : defaultSvg;
  return source.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
    const nextAttrs = attrs.replace(/\s(width|height)="[^"]*"/gi, "");
    return '<svg' + nextAttrs + ' width="' + size + '" height="' + size + '">';
  });
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function IconResizerTool({ manifest }: ToolAppProps) {
  const [svg, setSvg] = useState(defaultSvg);
  const [sizes, setSizes] = useState("16, 32, 48, 64, 128, 256");
  const [copied, setCopied] = useState(false);
  const parsedSizes = useMemo(() => sizes.split(/[,\s]+/).map((item) => Number(item)).filter((value) => Number.isFinite(value) && value > 0).slice(0, 12), [sizes]);
  const manifestJson = useMemo(() => JSON.stringify({ icons: parsedSizes.map((size) => ({ src: "icon-" + size + ".svg", sizes: size + "x" + size, type: "image/svg+xml" })) }, null, 2), [parsedSizes]);

  async function copyManifest() {
    await navigator.clipboard.writeText(manifestJson);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Icon export</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar"><label className="tool-field tool-field--compact"><span>Sizes</span><input value={sizes} onChange={(event) => { setSizes(event.target.value); setCopied(false); }} /></label><button type="button" onClick={() => void copyManifest()}>{copied ? "Copied manifest" : "Copy manifest"}</button></div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>SVG source</span><textarea value={svg} onChange={(event) => setSvg(event.target.value)} spellCheck={false} /></label><label className="tool-field"><span>Web app manifest icons</span><textarea value={manifestJson} readOnly spellCheck={false} /></label></div>
      <div className="detail-grid">{parsedSizes.map((size) => { const output = resizedSvg(svg, size); return <article className="detail-card" key={size}><h3>{size} x {size}</h3><img alt="" src={svgDataUrl(output)} style={{ width: Math.min(size, 96), height: Math.min(size, 96) }} /><button type="button" onClick={() => download("icon-" + size + ".svg", output)}>Download SVG</button></article>; })}</div>
    </section>
  );
}
