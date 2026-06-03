"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeTime(timestamp: number, length: number): string {
  let result = "";
  let remaining = timestamp;
  for (let i = length; i > 0; i--) {
    result = ENCODING[remaining % 32]! + result;
    remaining = Math.floor(remaining / 32);
  }
  return result;
}

function encodeRandom(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ENCODING[bytes[i]! % 32];
  }
  return result;
}

function generateUlid(): string {
  const timestamp = Date.now();
  return encodeTime(timestamp, 10) + encodeRandom(16);
}

function decodeUlidTime(ulid: string): Date | null {
  if (ulid.length !== 26) return null;
  const timePart = ulid.slice(0, 10).toUpperCase();
  let timestamp = 0;
  for (const char of timePart) {
    const index = ENCODING.indexOf(char);
    if (index === -1) return null;
    timestamp = timestamp * 32 + index;
  }
  return new Date(timestamp);
}

function clampCount(value: number) {
  return Math.max(1, Math.min(100, Math.floor(Number.isFinite(value) ? value : 1)));
}

export default function UlidGeneratorTool({ manifest }: ToolAppProps) {
  const [count, setCount] = useState(8);
  const [ulids, setUlids] = useState<string[]>(() =>
    Array.from({ length: 8 }, generateUlid)
  );
  const [decodeInput, setDecodeInput] = useState("");
  const [decodedTime, setDecodedTime] = useState("");
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    const n = clampCount(count);
    setCount(n);
    setUlids(Array.from({ length: n }, generateUlid));
    setCopied(false);
  }

  function handleDecode() {
    if (!decodeInput.trim()) {
      setDecodedTime("");
      return;
    }
    const date = decodeUlidTime(decodeInput.trim());
    if (date) {
      setDecodedTime(date.toISOString() + " (" + date.toLocaleString("zh-CN") + ")");
    } else {
      setDecodedTime("无效的 ULID 格式");
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(ulids.join("\n"));
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">有序标识</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>生成数量</span>
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => { setCount(Number(e.target.value)); setCopied(false); }}
          />
        </label>
        <button type="button" className="button--primary" onClick={handleGenerate}>
          生成 ULID
        </button>
        <button type="button" onClick={() => void handleCopy()}>
          {copied ? "已复制列表" : "复制列表"}
        </button>
      </div>

      <label className="tool-field">
        <span>ULID 列表</span>
        <textarea value={ulids.join("\n")} readOnly spellCheck={false} />
      </label>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>数量</h3>
          <p>{ulids.length}</p>
        </article>
        <article className="detail-card">
          <h3>编码</h3>
          <p>Crockford Base32</p>
        </article>
        <article className="detail-card">
          <h3>结构</h3>
          <p>10 位时间 + 16 位随机</p>
        </article>
      </div>

      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
          <span>解码 ULID 时间戳</span>
          <input
            type="text"
            value={decodeInput}
            onChange={(e) => setDecodeInput(e.target.value)}
            placeholder="输入 ULID，如 01ARZ3NDEKTSV4RRFFQ69G5FAV"
            spellCheck={false}
          />
        </label>
        <button type="button" onClick={handleDecode}>
          解码时间
        </button>
      </div>
      {decodedTime ? (
        <label className="tool-field">
          <span>解码结果</span>
          <input type="text" value={decodedTime} readOnly />
        </label>
      ) : null}

      <p className="tool-note">
        ULID 与 UUID v4 兼容，但支持按生成时间字典序排序。前 48 位为毫秒级时间戳，后 80 位为随机数。
      </p>
    </section>
  );
}
