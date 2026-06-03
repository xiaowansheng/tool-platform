"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Direction = "hexToStr" | "strToHex";
type Separator = "space" | "colon" | "comma" | "0x" | "none";

const separators: { value: Separator; label: string; joiner: string; regex: RegExp }[] = [
  { value: "space", label: "空格 (AB CD)", joiner: " ", regex: /[\s,;|]+/ },
  { value: "colon", label: "冒号 (AB:CD)", joiner: ":", regex: /[:\s]+/ },
  { value: "comma", label: "逗号 (AB,CD)", joiner: ",", regex: /[,\s]+/ },
  { value: "0x", label: "0x 前缀 (0xAB0xCD)", joiner: "0x", regex: /0x/i },
  { value: "none", label: "无分隔 (ABCD)", joiner: "", regex: /[\s,;:|]+/ }
];

function hexToString(hex: string, sep: Separator): string {
  const sepInfo = separators.find((s) => s.value === sep)!;
  let cleaned: string;

  if (sep === "none") {
    cleaned = hex.replace(/[\s,;:|0x]/gi, "");
  } else {
    cleaned = hex.replace(sepInfo.regex, "").replace(/^0x/i, "");
  }

  if (!cleaned) return "";
  if (cleaned.length % 2 !== 0) throw new Error("Hex 字符串长度必须为偶数");
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) throw new Error("包含无效的十六进制字符");

  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function stringToHex(str: string, sep: Separator, uppercase: boolean): string {
  const bytes = new TextEncoder().encode(str);
  const hexArr = Array.from(bytes, (b) => {
    const h = b.toString(16).padStart(2, "0");
    return uppercase ? h.toUpperCase() : h;
  });
  const sepInfo = separators.find((s) => s.value === sep)!;

  if (sep === "0x") {
    return "0x" + hexArr.join("0x");
  }
  return hexArr.join(sepInfo.joiner);
}

export default function HexStringConverterTool({ manifest }: ToolAppProps) {
  const [direction, setDirection] = useState<Direction>("hexToStr");
  const [input, setInput] = useState("");
  const [separator, setSeparator] = useState<Separator>("space");
  const [uppercase, setUppercase] = useState(true);
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
      if (!input.trim()) throw new Error("请输入内容");
      if (direction === "hexToStr") {
        setOutput(hexToString(input, separator));
      } else {
        setOutput(stringToHex(input, separator, uppercase));
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
          <p className="eyebrow">编码转换</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>转换方向</span>
          <select value={direction} onChange={(e) => { setDirection(e.target.value as Direction); resetOutput(); }}>
            <option value="hexToStr">Hex → 字符串</option>
            <option value="strToHex">字符串 → Hex</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>分隔符格式</span>
          <select value={separator} onChange={(e) => { setSeparator(e.target.value as Separator); resetOutput(); }}>
            {separators.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        {direction === "strToHex" ? (
          <label className="tool-field tool-field--compact">
            <span>大小写</span>
            <select value={uppercase ? "upper" : "lower"} onChange={(e) => { setUppercase(e.target.value === "upper"); resetOutput(); }}>
              <option value="upper">大写 (A-F)</option>
              <option value="lower">小写 (a-f)</option>
            </select>
          </label>
        ) : null}
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>{direction === "hexToStr" ? "十六进制输入" : "字符串输入"}</span>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); resetOutput(); }}
            spellCheck={false}
            placeholder={direction === "hexToStr" ? "例如: 48 65 6C 6C 6F" : "输入要转换的文本…"}
          />
        </label>
        <label className="tool-field">
          <span>{direction === "hexToStr" ? "字符串输出" : "十六进制输出"}</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={handleConvert}>转换</button>
        <button type="button" onClick={() => void handleCopy()} disabled={!output}>
          {copied ? "已复制" : "复制结果"}
        </button>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">使用 UTF-8 编码。Hex 转换在浏览器本地完成，不会上传任何数据。</p>
    </section>
  );
}
