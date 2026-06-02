"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type BitWidth = 8 | 16 | 32;
type Operation = "add" | "sub" | "mul" | "div" | "mod" | "and" | "or" | "xor" | "shl" | "shr";

interface ComputationResult {
  raw: bigint;
  unsigned: number;
  signed: number;
  binary: string;
  hex: string;
  overflow: boolean;
}

const opLabels: Record<Operation, string> = {
  add: "加 (+)", sub: "减 (-)", mul: "乘 (×)", div: "整除 (÷)",
  mod: "取模 (%)", and: "位与 (&)", or: "位或 (|)", xor: "异或 (^)",
  shl: "左移 (<<)", shr: "右移 (>>)"
};

function compute(a: number, b: number, op: Operation, bits: BitWidth): ComputationResult {
  const maxUnsigned = BigInt(2) ** BigInt(bits);
  const mask = maxUnsigned - 1n;
  const bigA = BigInt(a);
  const bigB = BigInt(b);

  let raw: bigint;
  switch (op) {
    case "add": raw = bigA + bigB; break;
    case "sub": raw = bigA - bigB; break;
    case "mul": raw = bigA * bigB; break;
    case "div": raw = b !== 0 ? bigA / bigB : 0n; break;
    case "mod": raw = b !== 0 ? bigA % bigB : 0n; break;
    case "and": raw = bigA & bigB; break;
    case "or": raw = bigA | bigB; break;
    case "xor": raw = bigA ^ bigB; break;
    case "shl": raw = bigA << bigB; break;
    case "shr": raw = bigA >> bigB; break;
  }

  const overflow = raw < 0n || raw >= maxUnsigned;
  const masked = raw < 0n ? (raw + maxUnsigned * (1n - raw / maxUnsigned)) & mask : raw & mask;
  const unsigned = Number(masked);
  const halfMax = Number(maxUnsigned / 2n);
  const signed = unsigned >= halfMax ? unsigned - Number(maxUnsigned) : unsigned;
  const binary = Number(masked).toString(2).padStart(bits, "0");
  const hex = Number(masked).toString(16).toUpperCase().padStart(bits / 4, "0");

  return { raw, unsigned, signed, binary, hex, overflow };
}

function formatBinaryGrouped(bin: string): string {
  return bin.replace(/(.{4})/g, "$1 ").trim();
}

export default function WasmIntegerMathLabTool({ manifest }: ToolAppProps) {
  const [a, setA] = useState(200);
  const [b, setB] = useState(100);
  const [op, setOp] = useState<Operation>("add");
  const [bits, setBits] = useState<BitWidth>(8);

  const result = useMemo(() => compute(a, b, op, bits), [a, b, op, bits]);
  const maxVal = Math.pow(2, bits) - 1;
  const minSigned = -Math.pow(2, bits - 1);
  const maxSigned = Math.pow(2, bits - 1) - 1;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">整数运算</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>操作数 A</span>
          <input type="number" value={a} onChange={(e) => setA(Number(e.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>运算</span>
          <select value={op} onChange={(e) => setOp(e.target.value as Operation)}>
            {Object.entries(opLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>操作数 B</span>
          <input type="number" value={b} onChange={(e) => setB(Number(e.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>位宽</span>
          <select value={bits} onChange={(e) => setBits(Number(e.target.value) as BitWidth)}>
            <option value={8}>u8 / i8</option>
            <option value={16}>u16 / i16</option>
            <option value={32}>u32 / i32</option>
          </select>
        </label>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>无符号值 (u{bits})</h3>
          <p className="mono-output">{result.unsigned}</p>
        </article>
        <article className="detail-card">
          <h3>有符号值 (i{bits})</h3>
          <p className="mono-output">{result.signed}</p>
        </article>
        <article className="detail-card">
          <h3>二进制</h3>
          <p className="mono-output" style={{ fontSize: "0.85rem" }}>{formatBinaryGrouped(result.binary)}</p>
        </article>
        <article className="detail-card">
          <h3>十六进制</h3>
          <p className="mono-output">0x{result.hex}</p>
        </article>
        <article className="detail-card">
          <h3>溢出</h3>
          <p style={{ color: result.overflow ? "var(--error, #e53e3e)" : "var(--success, #38a169)", fontWeight: 600 }}>
            {result.overflow ? "是" : "否"}
          </p>
        </article>
        <article className="detail-card">
          <h3>原始结果</h3>
          <p className="mono-output" style={{ fontSize: "0.85rem" }}>{result.raw.toString()}</p>
        </article>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>u{bits} 范围</h3>
          <p className="mono-output" style={{ fontSize: "0.8rem" }}>0 ~ {maxVal.toLocaleString()}</p>
        </article>
        <article className="detail-card">
          <h3>i{bits} 范围</h3>
          <p className="mono-output" style={{ fontSize: "0.8rem" }}>{minSigned.toLocaleString()} ~ {maxSigned.toLocaleString()}</p>
        </article>
      </div>

      <p className="tool-note">
        模拟 WebAssembly 整数运算行为：溢出后自动截断到指定位宽。
        适合理解有符号/无符号整数在不同位宽下的运算差异。
      </p>
    </section>
  );
}
