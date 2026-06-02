"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type CssUnit = "px" | "rem";

interface TypeToken {
  name: string;
  step: number;
  lineHeight: string;
  usage: string;
}

const typeTokens: TypeToken[] = [
  { name: "xs", step: -2, lineHeight: "1.45", usage: "辅助文字" },
  { name: "sm", step: -1, lineHeight: "1.55", usage: "说明文字" },
  { name: "base", step: 0, lineHeight: "1.65", usage: "正文" },
  { name: "lg", step: 1, lineHeight: "1.45", usage: "强调正文" },
  { name: "xl", step: 2, lineHeight: "1.25", usage: "小标题" },
  { name: "2xl", step: 3, lineHeight: "1.15", usage: "章节标题" },
  { name: "3xl", step: 4, lineHeight: "1.08", usage: "页面标题" }
];

function round(value: number) {
  return Number(value.toFixed(4));
}

function buildClamp(minSize: number, maxSize: number, minViewport: number, maxViewport: number, unit: CssUnit) {
  if (maxViewport <= minViewport) {
    throw new Error("最大视口必须大于最小视口");
  }

  if (maxSize < minSize) {
    throw new Error("最大尺寸必须大于或等于最小尺寸");
  }

  const slope = ((maxSize - minSize) / (maxViewport - minViewport)) * 100;
  const intercept = minSize - (slope / 100) * minViewport;
  const preferred = `${round(intercept)}${unit} + ${round(slope)}vw`;

  return `clamp(${round(minSize)}${unit}, ${preferred}, ${round(maxSize)}${unit})`;
}

function scaleValue(base: number, ratio: number, step: number) {
  return base * (ratio ** step);
}

function buildTypeScale(
  minBase: number,
  maxBase: number,
  minRatio: number,
  maxRatio: number,
  minViewport: number,
  maxViewport: number,
  unit: CssUnit
) {
  return typeTokens.map((token) => {
    const minSize = scaleValue(minBase, minRatio, token.step);
    const maxSize = Math.max(scaleValue(maxBase, maxRatio, token.step), minSize);

    return {
      ...token,
      minSize: round(minSize),
      maxSize: round(maxSize),
      clamp: buildClamp(minSize, maxSize, minViewport, maxViewport, unit)
    };
  });
}

export default function CssClampGeneratorTool({ manifest }: ToolAppProps) {
  const [minBase, setMinBase] = useState(1);
  const [maxBase, setMaxBase] = useState(1.125);
  const [minViewport, setMinViewport] = useState(360);
  const [maxViewport, setMaxViewport] = useState(1440);
  const [minRatio, setMinRatio] = useState(1.125);
  const [maxRatio, setMaxRatio] = useState(1.25);
  const [unit, setUnit] = useState<CssUnit>("rem");
  const [prefix, setPrefix] = useState("font");
  const [copied, setCopied] = useState(false);

  let scale: ReturnType<typeof buildTypeScale> = [];
  let css = "";
  let error = "";

  try {
    scale = buildTypeScale(minBase, maxBase, minRatio, maxRatio, minViewport, maxViewport, unit);
    css = [
      ":root {",
      ...scale.map((token) => `  --${prefix}-${token.name}: ${token.clamp};`),
      "}",
      "",
      ".fluid-type {",
      `  font-size: var(--${prefix}-base);`,
      "  line-height: 1.65;",
      "}",
      "",
      ".fluid-type h1 {",
      `  font-size: var(--${prefix}-3xl);`,
      "  line-height: 1.08;",
      "}",
      "",
      ".fluid-type h2 {",
      `  font-size: var(--${prefix}-2xl);`,
      "  line-height: 1.15;",
      "}",
      "",
      ".fluid-type h3 {",
      `  font-size: var(--${prefix}-xl);`,
      "  line-height: 1.25;",
      "}"
    ].join("\n");
  } catch (buildError) {
    error = buildError instanceof Error ? buildError.message : "clamp 生成失败";
  }

  async function handleCopy() {
    if (!css) {
      return;
    }

    await navigator.clipboard.writeText(css);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">设计工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>移动端正文</span>
          <input type="number" step="0.025" value={minBase} onChange={(event) => setMinBase(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>桌面端正文</span>
          <input type="number" step="0.025" value={maxBase} onChange={(event) => setMaxBase(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>最小视口 px</span>
          <input type="number" value={minViewport} onChange={(event) => setMinViewport(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>最大视口 px</span>
          <input type="number" value={maxViewport} onChange={(event) => setMaxViewport(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>移动端比例</span>
          <input type="number" step="0.025" value={minRatio} onChange={(event) => setMinRatio(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>桌面端比例</span>
          <input type="number" step="0.025" value={maxRatio} onChange={(event) => setMaxRatio(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>单位</span>
          <select value={unit} onChange={(event) => setUnit(event.target.value as CssUnit)}>
            <option value="rem">rem</option>
            <option value="px">px</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>Token 前缀</span>
          <input value={prefix} onChange={(event) => setPrefix(event.target.value.replace(/[^a-z0-9-]/gi, ""))} />
        </label>
        <button type="button" onClick={() => void handleCopy()}>
          {copied ? "已复制" : "复制 CSS"}
        </button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>Token 数</h3>
          <p>{scale.length} 个字体尺寸</p>
        </article>
        <article className="detail-card">
          <h3>视口范围</h3>
          <p>{minViewport}px - {maxViewport}px</p>
        </article>
        <article className="detail-card">
          <h3>比例</h3>
          <p>{minRatio} - {maxRatio}</p>
        </article>
      </div>

      <div className="type-scale-preview">
        {scale.map((token) => {
          const style: CSSProperties = {
            fontSize: token.clamp,
            lineHeight: token.lineHeight
          };

          return (
            <article key={token.name} className="type-scale-preview__row">
              <div>
                <p className="eyebrow">--{prefix}-{token.name}</p>
                <strong style={style}>{token.usage}</strong>
              </div>
              <code>{token.minSize}{unit} → {token.maxSize}{unit}</code>
            </article>
          );
        })}
      </div>

      <label className="tool-field">
        <span>CSS</span>
        <textarea value={css} readOnly spellCheck={false} />
      </label>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
