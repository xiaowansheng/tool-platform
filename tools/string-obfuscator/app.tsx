"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type MaskStyle = "asterisk" | "bullet" | "block" | "dot" | "hash";

const maskChars: Record<MaskStyle, string> = {
  asterisk: "*",
  bullet: "•",
  block: "█",
  dot: "●",
  hash: "#"
};

const maskLabels: Record<MaskStyle, string> = {
  asterisk: "星号 *",
  bullet: "圆点 •",
  block: "方块 █",
  dot: "实心 ●",
  hash: "井号 #"
};

interface ObfuscationConfig {
  showStart: number;
  showEnd: number;
  maskStyle: MaskStyle;
  preserveLength: boolean;
  separator: string;
  groupSize: number;
  groupEnabled: boolean;
}

function obfuscate(input: string, config: ObfuscationConfig): string {
  if (!input) return "";

  const { showStart, showEnd, maskStyle, preserveLength, separator, groupSize, groupEnabled } = config;
  const mask = maskChars[maskStyle];

  if (input.length <= showStart + showEnd) {
    return mask.repeat(input.length);
  }

  const start = input.slice(0, showStart);
  const end = input.slice(-showEnd);
  const middleLen = input.length - showStart - showEnd;
  const middleMasked = mask.repeat(preserveLength ? middleLen : Math.min(middleLen, 8));

  let result = start + middleMasked + end;

  if (groupEnabled && groupSize > 0) {
    const parts: string[] = [];
    for (let i = 0; i < result.length; i += groupSize) {
      parts.push(result.slice(i, i + groupSize));
    }
    result = parts.join(separator);
  }

  return result;
}

const presets = [
  { label: "API Key", config: { showStart: 4, showEnd: 4, maskStyle: "asterisk" as MaskStyle, preserveLength: true, separator: "", groupSize: 0, groupEnabled: false }, example: "sk-ant-api03-EXAMPLEKEY123456789" },
  { label: "信用卡号", config: { showStart: 0, showEnd: 4, maskStyle: "bullet" as MaskStyle, preserveLength: true, separator: " ", groupSize: 4, groupEnabled: true }, example: "4532015112830366" },
  { label: "IBAN", config: { showStart: 4, showEnd: 4, maskStyle: "asterisk" as MaskStyle, preserveLength: true, separator: " ", groupSize: 4, groupEnabled: true }, example: "DE89370400440532013000" },
  { label: "手机号", config: { showStart: 3, showEnd: 2, maskStyle: "dot" as MaskStyle, preserveLength: true, separator: "", groupSize: 0, groupEnabled: false }, example: "13812345678" },
  { label: "邮箱", config: { showStart: 2, showEnd: 11, maskStyle: "asterisk" as MaskStyle, preserveLength: true, separator: "", groupSize: 0, groupEnabled: false }, example: "user@example.com" },
  { label: "JWT Token", config: { showStart: 8, showEnd: 6, maskStyle: "block" as MaskStyle, preserveLength: false, separator: "", groupSize: 0, groupEnabled: false }, example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U" }
];

export default function StringObfuscatorTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("sk-ant-api03-EXAMPLEKEY123456789");
  const [config, setConfig] = useState<ObfuscationConfig>({
    showStart: 4,
    showEnd: 4,
    maskStyle: "asterisk",
    preserveLength: true,
    separator: "",
    groupSize: 0,
    groupEnabled: false
  });
  const [copied, setCopied] = useState(false);

  const result = obfuscate(input, config);

  function applyPreset(preset: typeof presets[number]) {
    setInput(preset.example);
    setConfig(preset.config);
    setCopied(false);
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本脱敏</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-option-list" style={{ marginBottom: "12px" }}>
        <span style={{ fontWeight: 500, marginRight: "8px" }}>预设：</span>
        {presets.map((p) => (
          <button key={p.label} type="button" onClick={() => applyPreset(p)} style={{ marginRight: "4px", fontSize: "0.85em" }}>
            {p.label}
          </button>
        ))}
      </div>

      <label className="tool-field">
        <span>输入文本</span>
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setCopied(false); }}
          spellCheck={false}
          placeholder="输入要脱敏的字符串..."
        />
      </label>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>显示前 N 位</span>
          <input
            type="number"
            min={0}
            max={20}
            value={config.showStart}
            onChange={(e) => setConfig({ ...config, showStart: Math.max(0, Number(e.target.value)) })}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>显示后 N 位</span>
          <input
            type="number"
            min={0}
            max={20}
            value={config.showEnd}
            onChange={(e) => setConfig({ ...config, showEnd: Math.max(0, Number(e.target.value)) })}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>遮盖样式</span>
          <select value={config.maskStyle} onChange={(e) => setConfig({ ...config, maskStyle: e.target.value as MaskStyle })}>
            {(Object.keys(maskLabels) as MaskStyle[]).map((k) => (
              <option key={k} value={k}>{maskLabels[k]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="tool-option-list">
        <label className="tool-check">
          <input
            type="checkbox"
            checked={config.preserveLength}
            onChange={(e) => setConfig({ ...config, preserveLength: e.target.checked })}
          />
          <span>保持原始长度</span>
        </label>
        <label className="tool-check">
          <input
            type="checkbox"
            checked={config.groupEnabled}
            onChange={(e) => setConfig({ ...config, groupEnabled: e.target.checked })}
          />
          <span>分组显示</span>
        </label>
        {config.groupEnabled ? (
          <>
            <label className="tool-field tool-field--compact" style={{ display: "inline-flex" }}>
              <span>每组位数</span>
              <input
                type="number"
                min={2}
                max={8}
                value={config.groupSize || 4}
                onChange={(e) => setConfig({ ...config, groupSize: Number(e.target.value) })}
                style={{ width: "60px" }}
              />
            </label>
            <label className="tool-field tool-field--compact" style={{ display: "inline-flex" }}>
              <span>分隔符</span>
              <input
                type="text"
                value={config.separator}
                onChange={(e) => setConfig({ ...config, separator: e.target.value })}
                style={{ width: "40px" }}
                placeholder=" "
              />
            </label>
          </>
        ) : null}
      </div>

      <div className="detail-grid">
        <article className="detail-card" style={{ gridColumn: "1 / -1" }}>
          <h3>脱敏结果</h3>
          <p style={{ fontFamily: "monospace", fontSize: "1.2em", wordBreak: "break-all" }}>
            {result || "（无输出）"}
          </p>
        </article>
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => void handleCopy()} disabled={!result}>
          {copied ? "已复制" : "复制结果"}
        </button>
      </div>

      <p className="tool-note">
        适合在截图、日志、演示文稿或聊天中分享敏感字符串时隐藏关键部分，同时保留足够的上下文信息用于识别。
      </p>
    </section>
  );
}
