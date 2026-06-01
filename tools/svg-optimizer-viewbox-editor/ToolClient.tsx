"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const sampleSvg = `<svg width="240" height="160" viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg">
  <title>Sample mark</title>
  <metadata>Created by a vector editor</metadata>
  <rect width="240" height="160" rx="28" fill="#0f766e"/>
  <circle cx="86.5000" cy="80.0000" r="34.0000" fill="#5eead4"/>
  <path d="M124.0000 50.0000L178.0000 80.0000L124.0000 110.0000Z" fill="#e8eff7"/>
</svg>`;

interface OptimizeOptions {
  viewBox: string;
  width: string;
  height: string;
  precision: number;
  removeDimensions: boolean;
  removeTitleDesc: boolean;
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function formatNumber(value: number, precision: number) {
  return Number(value.toFixed(precision)).toString();
}

function normalizeViewBox(value: string, precision = 3) {
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part)) || parts[2] <= 0 || parts[3] <= 0) {
    return "";
  }

  return parts.map((part) => formatNumber(part, precision)).join(" ");
}

function getSvgAttribute(svg: string, name: string) {
  const openTag = svg.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = openTag.match(new RegExp(`\\s${escaped}\\s*=\\s*(["'])(.*?)\\1`, "i"));

  return match?.[2] ?? "";
}

function setSvgAttribute(svg: string, name: string, value: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const attrPattern = new RegExp(`\\s${escaped}\\s*=\\s*(["']).*?\\1`, "i");

  return svg.replace(/<svg\b[^>]*>/i, (tag) => {
    if (attrPattern.test(tag)) {
      return tag.replace(attrPattern, ` ${name}="${value}"`);
    }

    return tag.replace(/<svg\b/i, `<svg ${name}="${value}"`);
  });
}

function removeSvgAttribute(svg: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return svg.replace(/<svg\b[^>]*>/i, (tag) => tag.replace(new RegExp(`\\s${escaped}\\s*=\\s*(["']).*?\\1`, "gi"), ""));
}

function optimizeSvg(input: string, options: OptimizeOptions) {
  const original = input.trim();
  const before = byteLength(original);
  const warnings: string[] = [];

  if (!/<svg[\s>]/i.test(original)) {
    return {
      svg: "",
      before,
      after: 0,
      saved: 0,
      detectedViewBox: "",
      warnings: ["请输入有效的 SVG 标记。"]
    };
  }

  let svg = original
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!doctype[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\s(?:xmlns:)?(?:inkscape|sodipodi):[a-z0-9_-]+\s*=\s*(["']).*?\1/gi, "");

  if (options.removeTitleDesc) {
    svg = svg
      .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
      .replace(/<title[\s\S]*?<\/title>/gi, "")
      .replace(/<desc[\s\S]*?<\/desc>/gi, "");
  }

  svg = svg.replace(/-?\d*\.\d+/g, (match) => formatNumber(Number(match), options.precision));

  const nextViewBox = normalizeViewBox(options.viewBox, options.precision);
  if (nextViewBox) {
    svg = setSvgAttribute(svg, "viewBox", nextViewBox);
  } else {
    warnings.push("viewBox 未应用：需要 4 个数字，且宽高必须大于 0。");
  }

  if (options.removeDimensions) {
    svg = removeSvgAttribute(removeSvgAttribute(svg, "width"), "height");
  } else {
    if (options.width.trim()) {
      svg = setSvgAttribute(svg, "width", options.width.trim());
    }

    if (options.height.trim()) {
      svg = setSvgAttribute(svg, "height", options.height.trim());
    }
  }

  svg = svg
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\/>/g, "/>")
    .trim();

  const after = byteLength(svg);

  return {
    svg,
    before,
    after,
    saved: before > 0 ? Math.round(((before - after) / before) * 100) : 0,
    detectedViewBox: getSvgAttribute(original, "viewBox"),
    warnings
  };
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function SvgOptimizerViewBoxEditorTool({ manifest }: ToolClientProps) {
  const [source, setSource] = useState(sampleSvg);
  const [viewBox, setViewBox] = useState("0 0 240 160");
  const [width, setWidth] = useState("240");
  const [height, setHeight] = useState("160");
  const [precision, setPrecision] = useState(2);
  const [removeDimensions, setRemoveDimensions] = useState(false);
  const [removeTitleDesc, setRemoveTitleDesc] = useState(true);
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => optimizeSvg(source, { viewBox, width, height, precision, removeDimensions, removeTitleDesc }),
    [height, precision, removeDimensions, removeTitleDesc, source, viewBox, width]
  );

  function useDetectedViewBox() {
    const detected = getSvgAttribute(source, "viewBox");
    const detectedWidth = getSvgAttribute(source, "width");
    const detectedHeight = getSvgAttribute(source, "height");

    if (detected) {
      setViewBox(detected);
    } else if (detectedWidth && detectedHeight) {
      setViewBox(`0 0 ${Number.parseFloat(detectedWidth)} ${Number.parseFloat(detectedHeight)}`);
    }

    if (detectedWidth) {
      setWidth(detectedWidth);
    }

    if (detectedHeight) {
      setHeight(detectedHeight);
    }
  }

  async function copyOutput() {
    if (!result.svg) {
      return;
    }

    await navigator.clipboard.writeText(result.svg);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">矢量工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>SVG 源码</span>
          <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>优化后 SVG</span>
          <textarea value={result.svg} readOnly spellCheck={false} />
        </label>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>viewBox</span>
          <input value={viewBox} onChange={(event) => setViewBox(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>宽度</span>
          <input value={width} onChange={(event) => setWidth(event.target.value)} disabled={removeDimensions} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>高度</span>
          <input value={height} onChange={(event) => setHeight(event.target.value)} disabled={removeDimensions} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>小数精度</span>
          <input
            type="number"
            min="0"
            max="5"
            value={precision}
            onChange={(event) => setPrecision(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="tool-option-list">
        <label className="tool-check">
          <input type="checkbox" checked={removeDimensions} onChange={(event) => setRemoveDimensions(event.target.checked)} />
          Remove width / height
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={removeTitleDesc} onChange={(event) => setRemoveTitleDesc(event.target.checked)} />
          Remove metadata / title / desc
        </label>
        <button type="button" onClick={useDetectedViewBox}>使用检测到的框</button>
        <button type="button" onClick={() => void copyOutput()}>{copied ? "已复制" : "复制 SVG"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>原始</h3>
          <p>{result.before} bytes</p>
        </article>
        <article className="detail-card">
          <h3>优化后</h3>
          <p>{result.after} bytes</p>
        </article>
        <article className="detail-card">
          <h3>节省</h3>
          <p>{result.saved}%</p>
        </article>
        <article className="detail-card">
          <h3>检测到的 viewBox</h3>
          <p className="mono-output">{result.detectedViewBox || "无"}</p>
        </article>
      </div>

      <div className="visual-preview svg-preview">
        {result.svg ? <img src={svgDataUrl(result.svg)} alt="优化后 SVG 预览" /> : <span>无效 SVG</span>}
      </div>

      {result.warnings.map((warning) => (
        <p key={warning} className="tool-error">{warning}</p>
      ))}
    </section>
  );
}
