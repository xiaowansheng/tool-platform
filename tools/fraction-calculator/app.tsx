"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Operator = "+" | "-" | "×" | "÷";

interface Fraction {
  num: number;
  den: number;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function simplify(f: Fraction): Fraction {
  if (f.den === 0) return f;
  const g = gcd(f.num, f.den);
  let num = f.num / g;
  let den = f.den / g;
  if (den < 0) { num = -num; den = -den; }
  return { num, den };
}

function parseFraction(input: string): Fraction | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Support: "3/4", "1 1/2" (mixed), "5" (whole number), "1.5" (decimal)
  const mixedMatch = trimmed.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]!);
    const num = parseInt(mixedMatch[2]!);
    const den = parseInt(mixedMatch[3]!);
    if (den === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    return simplify({ num: Math.abs(whole) * den * sign + num * sign, den });
  }

  const fracMatch = trimmed.match(/^(-?\d+)\/(-?\d+)$/);
  if (fracMatch) {
    return simplify({ num: parseInt(fracMatch[1]!), den: parseInt(fracMatch[2]!) });
  }

  const decMatch = trimmed.match(/^(-?\d+\.?\d*)$/);
  if (decMatch) {
    const str = decMatch[1]!;
    const dotIdx = str.indexOf(".");
    if (dotIdx === -1) {
      return simplify({ num: parseInt(str), den: 1 });
    }
    const decPlaces = str.length - dotIdx - 1;
    const factor = 10 ** decPlaces;
    return simplify({ num: Math.round(parseFloat(str) * factor), den: factor });
  }

  return null;
}

function calc(a: Fraction, op: Operator, b: Fraction): Fraction | null {
  switch (op) {
    case "+": return simplify({ num: a.num * b.den + b.num * a.den, den: a.den * b.den });
    case "-": return simplify({ num: a.num * b.den - b.num * a.den, den: a.den * b.den });
    case "×": return simplify({ num: a.num * b.num, den: a.den * b.den });
    case "÷":
      if (b.num === 0) return null;
      return simplify({ num: a.num * b.den, den: a.den * b.num });
    default: return null;
  }
}

function formatFraction(f: Fraction): string {
  if (f.den === 1) return String(f.num);
  return `${f.num}/${f.den}`;
}

function toDecimal(f: Fraction): string {
  if (f.den === 0) return "N/A";
  return (f.num / f.den).toFixed(8).replace(/\.?0+$/, "");
}

export default function FractionCalculatorTool({ manifest }: ToolAppProps) {
  const [left, setLeft] = useState("1/2");
  const [right, setRight] = useState("1/3");
  const [op, setOp] = useState<Operator>("+");
  const [result, setResult] = useState<Fraction | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function handleCalc() {
    setError("");
    setResult(null);
    setCopied(false);

    const a = parseFraction(left);
    const b = parseFraction(right);

    if (!a) { setError("左操作数格式无效，支持：3/4、1 1/2、0.5、5"); return; }
    if (!b) { setError("右操作数格式无效，支持：3/4、1 1/2、0.5、5"); return; }
    if (a.den === 0 || b.den === 0) { setError("分母不能为零"); return; }
    if (op === "÷" && b.num === 0) { setError("除数不能为零"); return; }

    const r = calc(a, op, b);
    if (!r) { setError("计算失败"); return; }
    if (r.den === 0) { setError("结果分母为零"); return; }
    setResult(r);
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(formatFraction(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const operators: Operator[] = ["+", "-", "×", "÷"];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数学计算</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>左操作数</span>
          <input value={left} onChange={(e) => setLeft(e.target.value)} placeholder="例如: 1/2, 1 1/2, 0.75" spellCheck={false} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>运算符</span>
          <select value={op} onChange={(e) => setOp(e.target.value as Operator)}>
            {operators.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>右操作数</span>
          <input value={right} onChange={(e) => setRight(e.target.value)} placeholder="例如: 1/3, 2, 0.25" spellCheck={false} />
        </label>
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={handleCalc}>计算</button>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}

      {result ? (
        <div className="case-grid">
          <article className="detail-card">
            <div className="tool-card__header">
              <div>
                <p className="eyebrow">最简分数</p>
                <h3>结果</h3>
              </div>
              <button type="button" onClick={() => void handleCopy()}>
                {copied ? "已复制" : "复制"}
              </button>
            </div>
            <p className="mono-output">{formatFraction(result)}</p>
          </article>
          <article className="detail-card">
            <div className="tool-card__header">
              <div>
                <p className="eyebrow">小数</p>
                <h3>十进制</h3>
              </div>
            </div>
            <p className="mono-output">{toDecimal(result)}</p>
          </article>
          <article className="detail-card">
            <div className="tool-card__header">
              <div>
                <p className="eyebrow">计算过程</p>
                <h3>步骤</h3>
              </div>
            </div>
            <p className="mono-output" style={{ fontSize: "0.8em" }}>
              {left} {op} {right} = {formatFraction(result)} ≈ {toDecimal(result)}
            </p>
          </article>
        </div>
      ) : null}

      <p className="tool-note">
        支持格式：分数（3/4）、带分数（1 1/2）、小数（0.75）、整数（5）。结果自动约分为最简分数，并显示十进制近似值。
      </p>
    </section>
  );
}
