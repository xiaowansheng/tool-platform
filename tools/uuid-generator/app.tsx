"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function createUuid() {
  const cryptoApi = globalThis.crypto;

  if (!cryptoApi?.getRandomValues) {
    throw new Error("当前环境不支持 Crypto API");
  }

  if (typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return hex.slice(0, 4).join("") + "-" + hex.slice(4, 6).join("") + "-" + hex.slice(6, 8).join("") + "-" + hex.slice(8, 10).join("") + "-" + hex.slice(10).join("");
}

function clampCount(value: number) {
  return Math.max(1, Math.min(100, Math.floor(Number.isFinite(value) ? value : 1)));
}

function createUuidList(count: number) {
  return Array.from({ length: clampCount(count) }, createUuid);
}

export default function UuidGeneratorTool({ manifest }: ToolAppProps) {
  const [count, setCount] = useState(8);
  const [uuids, setUuids] = useState<string[]>(() => createUuidList(8));
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function handleGenerate() {
    try {
      const nextCount = clampCount(count);
      setCount(nextCount);
      setUuids(createUuidList(nextCount));
      setCopied(false);
      setError("");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "UUID 生成失败");
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(uuids.join("\n"));
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">随机标识</p>
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
            onChange={(event) => { setCount(Number(event.target.value)); setCopied(false); }}
          />
        </label>
        <button type="button" className="button--primary" onClick={handleGenerate}>
          生成 UUID
        </button>
        <button type="button" onClick={() => void handleCopy()}>
          {copied ? "已复制列表" : "复制列表"}
        </button>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>数量</h3>
          <p>{uuids.length}</p>
        </article>
        <article className="detail-card">
          <h3>版本</h3>
          <p>v4</p>
        </article>
      </div>
      <label className="tool-field">
        <span>UUID 列表</span>
        <textarea value={uuids.join("\n")} readOnly spellCheck={false} />
      </label>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">UUID v4 适合生成随机唯一标识；如果业务需要有序 ID、短 ID 或可复现 ID，请选择对应的专用方案。</p>
    </section>
  );
}
