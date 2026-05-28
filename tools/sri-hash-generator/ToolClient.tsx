"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type SriAlgorithm = "SHA-256" | "SHA-384" | "SHA-512";

function bytesToBase64(bytes: ArrayBuffer) {
  const binary = Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

export default function SriHashGeneratorTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("console.log('Tool Platform');");
  const [algorithm, setAlgorithm] = useState<SriAlgorithm>("SHA-384");
  const [output, setOutput] = useState("");

  async function generate() {
    const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(input));
    setOutput(`${algorithm.toLowerCase().replace("-", "")}-${bytesToBase64(digest)}`);
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Security Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>Algorithm</span>
          <select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as SriAlgorithm)}>
            <option value="SHA-256">SHA-256</option>
            <option value="SHA-384">SHA-384</option>
            <option value="SHA-512">SHA-512</option>
          </select>
        </label>
        <button type="button" onClick={() => void generate()}>生成</button>
        <button type="button" onClick={() => void copyOutput()}>复制</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field"><span>资源内容</span><textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} /></label>
        <label className="tool-field"><span>integrity</span><textarea value={output} readOnly spellCheck={false} /></label>
      </div>
    </section>
  );
}
