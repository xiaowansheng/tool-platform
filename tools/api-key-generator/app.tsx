"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Format = "base64url" | "hex" | "readable";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const readable = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
  return bytes;
}

function encode(bytes: Uint8Array, format: Format) {
  if (format === "hex") return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const chars = format === "readable" ? readable : alphabet;
  return [...bytes].map((byte) => chars[byte % chars.length]).join("");
}

async function digestSuffix(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].slice(0, 4).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function ApiKeyGeneratorTool({ manifest }: ToolAppProps) {
  const [prefix, setPrefix] = useState("tp_live");
  const [length, setLength] = useState(32);
  const [count, setCount] = useState(5);
  const [format, setFormat] = useState<Format>("base64url");
  const [withChecksum, setWithChecksum] = useState(true);
  const [keys, setKeys] = useState<string[]>([]);

  async function generate() {
    const next: string[] = [];
    for (let index = 0; index < Math.max(1, count); index += 1) {
      const raw = encode(randomBytes(Math.ceil(length * 1.2)), format).slice(0, Math.max(8, length));
      const base = `${prefix}_${raw}`;
      next.push(withChecksum ? `${base}_${await digestSuffix(base)}` : base);
    }
    setKeys(next);
  }

  async function copyKeys() {
    await navigator.clipboard.writeText(keys.join("\n"));
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Secrets</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>前缀</span><input value={prefix} onChange={(event) => setPrefix(event.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))} /></label>
        <label className="tool-field tool-field--compact"><span>随机长度</span><input type="number" min="8" max="128" value={length} onChange={(event) => setLength(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>数量</span><input type="number" min="1" max="50" value={count} onChange={(event) => setCount(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>格式</span><select value={format} onChange={(event) => setFormat(event.target.value as Format)}><option value="base64url">base64url</option><option value="hex">hex</option><option value="readable">readable</option></select></label>
      </div>
      <div className="tool-option-list"><label className="tool-check"><input type="checkbox" checked={withChecksum} onChange={(event) => setWithChecksum(event.target.checked)} /><span>追加 SHA-256 校验后缀</span></label></div>
      <div className="tool-toolbar"><button type="button" className="button--primary" onClick={() => void generate()}>生成密钥</button><button type="button" onClick={() => void copyKeys()} disabled={!keys.length}>复制全部</button></div>
      <label className="tool-field"><span>生成结果</span><textarea value={keys.join("\n")} readOnly rows={10} spellCheck={false} /></label>
      <p className="tool-note">密钥仅在浏览器本地生成，不会发送到服务器。生产环境仍建议配合服务端唯一性校验和权限范围绑定。</p>
    </section>
  );
}
