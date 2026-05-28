"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const bases = [
  { label: "Binary", radix: 2, prefix: "0b" },
  { label: "Octal", radix: 8, prefix: "0o" },
  { label: "Decimal", radix: 10, prefix: "" },
  { label: "Hex", radix: 16, prefix: "0x" }
] as const;

type Radix = (typeof bases)[number]["radix"];

function stripRadixPrefix(input: string, radix: Radix) {
  const trimmed = input.trim();
  const sign = trimmed.startsWith("-") || trimmed.startsWith("+") ? trimmed.slice(0, 1) : "";
  const unsigned = sign ? trimmed.slice(1) : trimmed;
  const prefixByRadix: Partial<Record<Radix, RegExp>> = {
    2: /^0b/i,
    8: /^0o/i,
    16: /^0x/i
  };
  const matchingPrefix = prefixByRadix[radix];

  if (matchingPrefix?.test(unsigned)) {
    return `${sign}${unsigned.replace(matchingPrefix, "")}`;
  }

  if (/^0[bBoOxX]/.test(unsigned)) {
    throw new Error("输入前缀与所选进制不匹配");
  }

  return trimmed;
}

function parseInteger(input: string, radix: Radix) {
  const normalized = stripRadixPrefix(input, radix);

  if (!normalized) {
    throw new Error("请输入整数");
  }

  const value = Number.parseInt(normalized, radix);

  if (!Number.isSafeInteger(value)) {
    throw new Error("输入超出安全整数范围");
  }

  if (value.toString(radix).toLowerCase() !== normalized.toLowerCase().replace(/^0+/, "") && value !== 0) {
    throw new Error("输入与所选进制不匹配");
  }

  return value;
}

export default function NumberBaseConverterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("255");
  const [radix, setRadix] = useState<Radix>(10);
  const [copied, setCopied] = useState("");

  let value = 0;
  let error = "";

  try {
    value = parseInteger(input, radix);
  } catch (parseError) {
    error = parseError instanceof Error ? parseError.message : "转换失败";
  }

  async function copy(label: string, output: string) {
    await navigator.clipboard.writeText(output);
    setCopied(label);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Developer Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>输入</span>
          <input value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>输入进制</span>
          <select value={radix} onChange={(event) => setRadix(Number(event.target.value) as Radix)}>
            {bases.map((base) => (
              <option key={base.radix} value={base.radix}>
                {base.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="case-grid">
        {bases.map((base) => {
          const output = error ? "" : `${base.prefix}${value.toString(base.radix).toUpperCase()}`;

          return (
            <article key={base.radix} className="detail-card">
              <div className="tool-card__header">
                <h3>{base.label}</h3>
                <button type="button" onClick={() => void copy(base.label, output)} disabled={Boolean(error)}>
                  {copied === base.label ? "已复制" : "复制"}
                </button>
              </div>
              <p className="mono-output">{output || "invalid"}</p>
            </article>
          );
        })}
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
