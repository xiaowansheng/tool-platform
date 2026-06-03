"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Unit = "px" | "rem";
type ScaleMode = "static" | "fluid";

interface TypeToken {
  name: string;
  step: number;
  lineHeight: string;
  usage: string;
}

const ratioPresets = [
  { label: "小三度", value: 1.2 },
  { label: "大三度", value: 1.25 },
  { label: "纯四度", value: 1.333 },
  { label: "黄金比例", value: 1.618 }
];

const fluidTypeTokens: TypeToken[] = [
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

function formatSize(px: number, unit: Unit) {
  return unit === "rem" ? `${round(px / 16)}rem` : `${round(px)}px`;
}

function buildClamp(minSize: number, maxSize: number, minViewport: number, maxViewport: number, unit: Unit) {
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
  return base * ratio ** step;
}

export default function FontScaleGeneratorTool({ manifest }: ToolAppProps) {
  const [mode, setMode] = useState<ScaleMode>("static");
  const [baseSize, setBaseSize] = useState(16);
  const [ratio, setRatio] = useState(1.25);
  const [downSteps, setDownSteps] = useState(2);
  const [upSteps, setUpSteps] = useState(6);
  const [lineHeight, setLineHeight] = useState(1.45);
  const [unit, setUnit] = useState<Unit>("rem");
  const [minBase, setMinBase] = useState(1);
  const [maxBase, setMaxBase] = useState(1.125);
  const [minViewport, setMinViewport] = useState(360);
  const [maxViewport, setMaxViewport] = useState(1440);
  const [minRatio, setMinRatio] = useState(1.125);
  const [maxRatio, setMaxRatio] = useState(1.25);
  const [prefix, setPrefix] = useState("font");
  const [copied, setCopied] = useState(false);

  const staticScale = useMemo(() => {
    return Array.from({ length: downSteps + upSteps + 1 }, (_, index) => {
      const step = index - downSteps;
      const px = baseSize * ratio ** step;
      const name = step === 0 ? "base" : step > 0 ? `${step}xl` : `xs${Math.abs(step)}`;

      return {
        step,
        name,
        px,
        size: formatSize(px, unit),
        lineHeight: round(px * lineHeight)
      };
    });
  }, [baseSize, downSteps, lineHeight, ratio, unit, upSteps]);

  const staticCss = useMemo(() => {
    const tokenLines = staticScale.map((item) => `  --font-size-${item.name}: ${item.size};`);
    const lineLines = staticScale.map((item) => `  --line-height-${item.name}: ${formatSize(item.lineHeight, unit)};`);

    return [":root {", ...tokenLines, ...lineLines, "}"].join("\n");
  }, [staticScale, unit]);

  const fluidScaleResult = useMemo(() => {
    try {
      const scale = fluidTypeTokens.map((token) => {
        const scaledMin = scaleValue(minBase, minRatio, token.step);
        const scaledMax = Math.max(scaleValue(maxBase, maxRatio, token.step), scaledMin);

        return {
          ...token,
          minSize: round(scaledMin),
          maxSize: round(scaledMax),
          clamp: buildClamp(scaledMin, scaledMax, minViewport, maxViewport, unit)
        };
      });

      const css = [
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

      return {
        scale,
        css,
        error: ""
      };
    } catch (buildError) {
      return {
        scale: [] as Array<TypeToken & { minSize: number; maxSize: number; clamp: string }>,
        css: "",
        error: buildError instanceof Error ? buildError.message : "clamp 生成失败"
      };
    }
  }, [maxBase, maxRatio, maxViewport, minBase, minRatio, minViewport, prefix, unit]);

  const activeCss = mode === "static" ? staticCss : fluidScaleResult.css;

  async function copyCss() {
    if (!activeCss) {
      return;
    }

    await navigator.clipboard.writeText(activeCss);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">排版工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar" style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          className={mode === "static" ? "button--primary" : undefined}
          onClick={() => {
            setMode("static");
            setCopied(false);
          }}
        >
          静态 scale
        </button>
        <button
          type="button"
          className={mode === "fluid" ? "button--primary" : undefined}
          onClick={() => {
            setMode("fluid");
            setCopied(false);
          }}
        >
          Fluid clamp
        </button>
      </div>

      {mode === "static" ? (
        <>
          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>基础字号 px</span>
              <input type="number" min="10" max="32" value={baseSize} onChange={(event) => { setBaseSize(Number(event.target.value)); setCopied(false); }} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>比例</span>
              <select value={ratio} onChange={(event) => { setRatio(Number(event.target.value)); setCopied(false); }}>
                {ratioPresets.map((preset) => (
                  <option key={preset.label} value={preset.value}>{preset.label} ({preset.value})</option>
                ))}
              </select>
            </label>
            <label className="tool-field tool-field--compact">
              <span>向下级数</span>
              <input type="number" min="0" max="5" value={downSteps} onChange={(event) => { setDownSteps(Number(event.target.value)); setCopied(false); }} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>向上级数</span>
              <input type="number" min="1" max="10" value={upSteps} onChange={(event) => { setUpSteps(Number(event.target.value)); setCopied(false); }} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>行高</span>
              <input type="number" min="1" max="2" step="0.05" value={lineHeight} onChange={(event) => { setLineHeight(Number(event.target.value)); setCopied(false); }} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>单位</span>
              <select value={unit} onChange={(event) => { setUnit(event.target.value as Unit); setCopied(false); }}>
                <option value="rem">rem</option>
                <option value="px">px</option>
              </select>
            </label>
          </div>

          <div className="font-scale-list">
            {staticScale.map((item) => (
              <article key={item.name} className="detail-card">
                <p className="eyebrow">阶梯 {item.step}</p>
                <h3>{item.name}</h3>
                <strong style={{ fontSize: item.size, lineHeight: formatSize(item.lineHeight, unit) }}>排版预览</strong>
                <p>{item.size} / {formatSize(item.lineHeight, unit)}</p>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>移动端正文</span>
              <input type="number" step="0.025" value={minBase} onChange={(event) => { setMinBase(Number(event.target.value)); setCopied(false); }} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>桌面端正文</span>
              <input type="number" step="0.025" value={maxBase} onChange={(event) => { setMaxBase(Number(event.target.value)); setCopied(false); }} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>最小视口 px</span>
              <input type="number" value={minViewport} onChange={(event) => { setMinViewport(Number(event.target.value)); setCopied(false); }} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>最大视口 px</span>
              <input type="number" value={maxViewport} onChange={(event) => { setMaxViewport(Number(event.target.value)); setCopied(false); }} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>移动端比例</span>
              <input type="number" step="0.025" value={minRatio} onChange={(event) => { setMinRatio(Number(event.target.value)); setCopied(false); }} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>桌面端比例</span>
              <input type="number" step="0.025" value={maxRatio} onChange={(event) => { setMaxRatio(Number(event.target.value)); setCopied(false); }} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>单位</span>
              <select value={unit} onChange={(event) => { setUnit(event.target.value as Unit); setCopied(false); }}>
                <option value="rem">rem</option>
                <option value="px">px</option>
              </select>
            </label>
            <label className="tool-field tool-field--compact">
              <span>Token 前缀</span>
              <input value={prefix} onChange={(event) => { setPrefix(event.target.value.replace(/[^a-z0-9-]/gi, "")); setCopied(false); }} />
            </label>
          </div>

          <div className="detail-grid">
            <article className="detail-card">
              <h3>Token 数</h3>
              <p>{fluidScaleResult.scale.length} 个字体尺寸</p>
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
            {fluidScaleResult.scale.map((token) => {
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
        </>
      )}

      <label className="tool-field">
        <span>{mode === "static" ? "CSS 变量" : "Fluid CSS"}</span>
        <textarea value={activeCss} readOnly spellCheck={false} />
      </label>

      {mode === "fluid" && fluidScaleResult.error ? <p className="tool-error">{fluidScaleResult.error}</p> : null}

      <button type="button" onClick={() => void copyCss()} disabled={!activeCss}>{copied ? "已复制" : "复制 CSS"}</button>
    </section>
  );
}
