"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

// RFC 3492 Punycode implementation
const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;
const DELIMITER = "-";

function adapt(delta: number, numPoints: number, firstTime: boolean): number {
  delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) >> 1) {
    delta = Math.floor(delta / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
}

function digitToBasic(digit: number): number {
  return digit + 22 + 75 * Number(digit < 26);
}

function basicToDigit(codePoint: number): number {
  if (codePoint - 0x30 < 0x0a) return codePoint - 0x16;
  if (codePoint - 0x41 < 0x1a) return codePoint - 0x41;
  if (codePoint - 0x61 < 0x1a) return codePoint - 0x61;
  return BASE;
}

function encode(input: string): string {
  const output: string[] = [];
  const codePoints = [...input].map((c) => c.codePointAt(0)!);
  let n = INITIAL_N;
  let delta = 0;
  let bias = INITIAL_BIAS;

  for (const cp of codePoints) {
    if (cp < 0x80) output.push(String.fromCodePoint(cp));
  }

  const basicLen = output.length;
  let h = basicLen;

  if (basicLen > 0) output.push(DELIMITER);

  while (h < codePoints.length) {
    let m = Infinity;
    for (const cp of codePoints) {
      if (cp >= n && cp < m) m = cp;
    }

    delta += (m - n) * (h + 1);
    n = m;

    for (const cp of codePoints) {
      if (cp < n) delta++;
      if (cp === n) {
        let q = delta;
        for (let k = BASE; ; k += BASE) {
          const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
          if (q < t) break;
          output.push(String.fromCodePoint(digitToBasic(t + ((q - t) % (BASE - t)))));
          q = Math.floor((q - t) / (BASE - t));
        }
        output.push(String.fromCodePoint(digitToBasic(q)));
        bias = adapt(delta, h + 1, h === basicLen);
        delta = 0;
        h++;
      }
    }

    delta++;
    n++;
  }

  return output.join("");
}

function decode(input: string): string {
  const output: number[] = [];
  let n = INITIAL_N;
  let bias = INITIAL_BIAS;
  let i = 0;

  const delimIdx = input.lastIndexOf(DELIMITER);
  let basicLen = delimIdx >= 0 ? delimIdx : 0;

  for (let j = 0; j < basicLen; j++) {
    const cp = input.codePointAt(j)!;
    if (cp >= 0x80) throw new Error("Invalid Punycode input");
    output.push(cp);
  }

  let idx = basicLen > 0 ? basicLen + 1 : 0;

  while (idx < input.length) {
    const oldi = i;
    let w = 1;

    for (let k = BASE; ; k += BASE) {
      if (idx >= input.length) throw new Error("Invalid Punycode input");
      const digit = basicToDigit(input.codePointAt(idx++)!);
      if (digit >= BASE) throw new Error("Invalid Punycode digit");
      i += digit * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
    }

    bias = adapt(i - oldi, output.length + 1, oldi === 0);
    n += Math.floor(i / (output.length + 1));
    i %= output.length + 1;
    output.splice(i, 0, n);
    i++;
  }

  return output.map((cp) => String.fromCodePoint(cp)).join("");
}

function toPunycode(domain: string): string {
  return domain
    .split(".")
    .map((label) => {
      if (/^[a-zA-Z0-9-]+$/.test(label)) return label;
      return "xn--" + encode(label);
    })
    .join(".");
}

function fromPunycode(domain: string): string {
  return domain
    .split(".")
    .map((label) => {
      if (label.toLowerCase().startsWith("xn--")) {
        return decode(label.slice(4));
      }
      return label;
    })
    .join(".");
}

export default function PunycodeConverterTool({ manifest }: ToolAppProps) {
  const [direction, setDirection] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function resetOutput() {
    setOutput("");
    setError("");
    setCopied(false);
  }

  function handleConvert() {
    try {
      if (!input.trim()) throw new Error("请输入域名");
      if (direction === "encode") {
        setOutput(toPunycode(input.trim()));
      } else {
        setOutput(fromPunycode(input.trim()));
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "转换失败");
      setOutput("");
    }
    setCopied(false);
  }

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">域名编码</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>转换方向</span>
          <select value={direction} onChange={(e) => { setDirection(e.target.value as "encode" | "decode"); resetOutput(); }}>
            <option value="encode">Unicode → Punycode (xn--)</option>
            <option value="decode">Punycode (xn--) → Unicode</option>
          </select>
        </label>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>{direction === "encode" ? "国际化域名" : "Punycode 域名"}</span>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); resetOutput(); }}
            spellCheck={false}
            placeholder={direction === "encode" ? "例如: 中国.cn" : "例如: xn--fiqs8s.cn"}
            rows={4}
          />
        </label>
        <label className="tool-field">
          <span>{direction === "encode" ? "Punycode 结果" : "Unicode 域名"}</span>
          <textarea value={output} readOnly spellCheck={false} rows={4} />
        </label>
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={handleConvert}>转换</button>
        <button type="button" onClick={() => void handleCopy()} disabled={!output}>
          {copied ? "已复制" : "复制结果"}
        </button>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">
        实现 RFC 3492 Punycode 算法。支持完整域名（多标签用 . 分隔），非 ASCII 标签自动加 xn-- 前缀。所有计算在浏览器本地完成。
      </p>
    </section>
  );
}
