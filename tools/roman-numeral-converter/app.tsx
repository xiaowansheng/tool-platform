"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const ROMAN_VALUES: [string, number][] = [
  ["M", 1000], ["CM", 900], ["D", 500], ["CD", 400],
  ["C", 100], ["XC", 90], ["L", 50], ["XL", 40],
  ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]
];

function numberToRoman(num: number): string {
  if (num < 1 || num > 3999 || !Number.isInteger(num)) return "";
  let result = "";
  let remaining = num;
  for (const [symbol, value] of ROMAN_VALUES) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result;
}

function romanToNumber(roman: string): number | null {
  const cleaned = roman.trim().toUpperCase();
  if (!cleaned || !/^[MDCLXVI]+$/.test(cleaned)) return null;

  const romanMap: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let result = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const current = romanMap[cleaned[i]!]!;
    const next = cleaned[i + 1] ? romanMap[cleaned[i + 1]!]! : 0;
    if (current < next) {
      result -= current;
    } else {
      result += current;
    }
  }

  // Validate by converting back
  if (result < 1 || result > 3999) return null;
  if (numberToRoman(result) !== cleaned) return null;
  return result;
}

const referenceTable = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 50, 100, 500, 1000, 1994, 2024, 3999];

export default function RomanNumeralConverterTool({ manifest }: ToolAppProps) {
  const [numInput, setNumInput] = useState("");
  const [romanInput, setRomanInput] = useState("");
  const [numToRomanResult, setNumToRomanResult] = useState("");
  const [romanToNumResult, setRomanToNumResult] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  function handleNumToRoman() {
    const num = parseInt(numInput, 10);
    if (isNaN(num) || num < 1 || num > 3999) {
      setNumToRomanResult("请输入 1-3999 之间的整数");
      return;
    }
    const result = numberToRoman(num);
    setNumToRomanResult(result);
    setRomanInput(result);
    setRomanToNumResult(String(num));
    setError("");
  }

  function handleRomanToNum() {
    const result = romanToNumber(romanInput);
    if (result === null) {
      setRomanToNumResult("无效的罗马数字");
      return;
    }
    setRomanToNumResult(String(result));
    setNumInput(String(result));
    setNumToRomanResult(romanInput.toUpperCase());
    setError("");
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数字转换</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--two-column">
        <div>
          <label className="tool-field">
            <span>阿拉伯数字</span>
            <input
              type="number"
              min={1}
              max={3999}
              value={numInput}
              onChange={(e) => setNumInput(e.target.value)}
              placeholder="1 - 3999"
            />
          </label>
          <button type="button" className="button--primary" onClick={handleNumToRoman} style={{ marginTop: "8px" }}>
            转为罗马数字 →
          </button>
          {numToRomanResult ? (
            <div className="tool-toolbar" style={{ marginTop: "8px" }}>
              <input type="text" value={numToRomanResult} readOnly style={{ fontFamily: "monospace", fontSize: "1.2em" }} />
              <button type="button" onClick={() => void handleCopy(numToRomanResult, "num")}>
                {copied === "num" ? "已复制" : "复制"}
              </button>
            </div>
          ) : null}
        </div>

        <div>
          <label className="tool-field">
            <span>罗马数字</span>
            <input
              type="text"
              value={romanInput}
              onChange={(e) => setRomanInput(e.target.value.toUpperCase())}
              placeholder="如 MMXXIV"
              spellCheck={false}
            />
          </label>
          <button type="button" className="button--primary" onClick={handleRomanToNum} style={{ marginTop: "8px" }}>
            ← 转为阿拉伯数字
          </button>
          {romanToNumResult ? (
            <div className="tool-toolbar" style={{ marginTop: "8px" }}>
              <input type="text" value={romanToNumResult} readOnly style={{ fontFamily: "monospace", fontSize: "1.2em" }} />
              <button type="button" onClick={() => void handleCopy(romanToNumResult, "roman")}>
                {copied === "roman" ? "已复制" : "复制"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Reference table */}
      <label className="tool-field">
        <span>常用对照表</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "4px", padding: "8px 0" }}>
          {referenceTable.map((n) => (
            <div key={n} style={{ padding: "4px 8px", fontFamily: "monospace", fontSize: "0.9em" }}>
              <strong>{n}</strong> = {numberToRoman(n)}
            </div>
          ))}
        </div>
      </label>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">
        标准罗马数字范围为 1-3999。支持减法记法（如 IV=4, IX=9, XL=40 等）。
      </p>
    </section>
  );
}
