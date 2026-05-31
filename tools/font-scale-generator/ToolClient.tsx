"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type Unit = "px" | "rem";

const ratioPresets = [
  { label: "小三度", value: 1.2 },
  { label: "大三度", value: 1.25 },
  { label: "纯四度", value: 1.333 },
  { label: "黄金比例", value: 1.618 }
];

function round(value: number) {
  return Number(value.toFixed(3));
}

function formatSize(px: number, unit: Unit) {
  return unit === "rem" ? `${round(px / 16)}rem` : `${round(px)}px`;
}

export default function FontScaleGeneratorTool({ manifest }: ToolClientProps) {
  const [baseSize, setBaseSize] = useState(16);
  const [ratio, setRatio] = useState(1.25);
  const [downSteps, setDownSteps] = useState(2);
  const [upSteps, setUpSteps] = useState(6);
  const [lineHeight, setLineHeight] = useState(1.45);
  const [unit, setUnit] = useState<Unit>("rem");
  const [copied, setCopied] = useState(false);

  const scale = useMemo(() => {
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

  const css = useMemo(() => {
    const tokenLines = scale.map((item) => `  --font-size-${item.name}: ${item.size};`);
    const lineLines = scale.map((item) => `  --line-height-${item.name}: ${formatSize(item.lineHeight, unit)};`);

    return [":root {", ...tokenLines, ...lineLines, "}"].join("\n");
  }, [scale, unit]);

  async function copyCss() {
    await navigator.clipboard.writeText(css);
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

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>基础字号 px</span>
          <input type="number" min="10" max="32" value={baseSize} onChange={(event) => setBaseSize(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>比例</span>
          <select value={ratio} onChange={(event) => setRatio(Number(event.target.value))}>
            {ratioPresets.map((preset) => (
              <option key={preset.label} value={preset.value}>{preset.label} ({preset.value})</option>
            ))}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>向下级数</span>
          <input type="number" min="0" max="5" value={downSteps} onChange={(event) => setDownSteps(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>向上级数</span>
          <input type="number" min="1" max="10" value={upSteps} onChange={(event) => setUpSteps(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>行高</span>
          <input type="number" min="1" max="2" step="0.05" value={lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>单位</span>
          <select value={unit} onChange={(event) => setUnit(event.target.value as Unit)}>
            <option value="rem">rem</option>
            <option value="px">px</option>
          </select>
        </label>
      </div>

      <div className="font-scale-list">
        {scale.map((item) => (
          <article key={item.name} className="detail-card">
            <p className="eyebrow">阶梯 {item.step}</p>
            <h3>{item.name}</h3>
            <strong style={{ fontSize: item.size, lineHeight: formatSize(item.lineHeight, unit) }}>排版预览</strong>
            <p>{item.size} / {formatSize(item.lineHeight, unit)}</p>
          </article>
        ))}
      </div>

      <label className="tool-field">
        <span>CSS 变量</span>
        <textarea value={css} readOnly spellCheck={false} />
      </label>

      <button type="button" onClick={() => void copyCss()}>{copied ? "已复制" : "复制 CSS 变量"}</button>
    </section>
  );
}
