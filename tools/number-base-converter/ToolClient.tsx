"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const bases = [
  { label: "二进制", short: "BIN", radix: 2, prefix: "0b", digitPattern: /^[01]+$/i },
  { label: "八进制", short: "OCT", radix: 8, prefix: "0o", digitPattern: /^[0-7]+$/i },
  { label: "十进制", short: "DEC", radix: 10, prefix: "", digitPattern: /^[0-9]+$/i },
  { label: "十六进制", short: "HEX", radix: 16, prefix: "0x", digitPattern: /^[0-9a-f]+$/i }
] as const;

type BaseInfo = (typeof bases)[number];
type Radix = BaseInfo["radix"];

const prefixByRadix: Partial<Record<Radix, RegExp>> = {
  2: /^0b/i,
  8: /^0o/i,
  16: /^0x/i
};

function getBase(radix: Radix) {
  return bases.find((base) => base.radix === radix) ?? bases[2];
}

function parseInteger(input: string, radix: Radix) {
  const trimmed = input.trim().replace(/_/g, "");
  const sign = trimmed.startsWith("-") || trimmed.startsWith("+") ? trimmed.slice(0, 1) : "";
  const unsigned = sign ? trimmed.slice(1) : trimmed;
  const matchingPrefix = prefixByRadix[radix];
  const hasKnownPrefix = /^0[bBoOxX]/.test(unsigned);

  if (!unsigned) {
    throw new Error("请输入整数");
  }

  if (!matchingPrefix?.test(unsigned) && hasKnownPrefix) {
    throw new Error("输入前缀与所选进制不匹配");
  }

  const digits = matchingPrefix?.test(unsigned) ? unsigned.replace(matchingPrefix, "") : unsigned;
  const base = getBase(radix);

  if (!digits || !base.digitPattern.test(digits)) {
    throw new Error("输入与所选进制不匹配");
  }

  const unsignedValue = base.radix === 10 ? BigInt(digits) : BigInt(base.prefix + digits);

  return sign === "-" ? -unsignedValue : unsignedValue;
}

function formatBigInt(value: bigint, base: BaseInfo) {
  const isNegative = value < 0n;
  const absoluteValue = isNegative ? -value : value;

  return (isNegative ? "-" : "") + base.prefix + absoluteValue.toString(base.radix).toUpperCase();
}

export default function NumberBaseConverterTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("255");
  const [radix, setRadix] = useState<Radix>(10);
  const [copied, setCopied] = useState<Radix | null>(null);

  let value = 0n;
  let error = "";

  try {
    value = parseInteger(input, radix);
  } catch (parseError) {
    error = parseError instanceof Error ? parseError.message : "转换失败";
  }

  async function copy(base: BaseInfo, output: string) {
    await navigator.clipboard.writeText(output);
    setCopied(base.radix);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数值转换</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>输入整数</span>
          <input value={input} onChange={(event) => { setInput(event.target.value); setCopied(null); }} spellCheck={false} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>输入进制</span>
          <select value={radix} onChange={(event) => { setRadix(Number(event.target.value) as Radix); setCopied(null); }}>
            {bases.map((base) => (
              <option key={base.radix} value={base.radix}>
                {base.label} ({base.short})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="case-grid">
        {bases.map((base) => {
          const output = error ? "" : formatBigInt(value, base);

          return (
            <article key={base.radix} className="detail-card">
              <div className="tool-card__header">
                <div>
                  <p className="eyebrow">{base.short}</p>
                  <h3>{base.label}</h3>
                </div>
                <button type="button" onClick={() => void copy(base, output)} disabled={Boolean(error)}>
                  {copied === base.radix ? "已复制" : "复制"}
                </button>
              </div>
              <p className="mono-output">{output || "待修正"}</p>
            </article>
          );
        })}
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">支持前缀 0b、0o、0x 和下划线分隔符；大整数使用 BigInt 转换，不会按 JavaScript Number 截断。</p>
    </section>
  );
}
