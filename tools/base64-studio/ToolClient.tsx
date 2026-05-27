"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function Base64StudioTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState("Tool Platform");
  const [output, setOutput] = useState("VG9vbCBQbGF0Zm9ybQ==");
  const [error, setError] = useState("");

  function handleEncode() {
    try {
      const encoded = encodeBase64(input);
      setOutput(encoded);
      setError("");
    } catch (encodeError) {
      setError(encodeError instanceof Error ? encodeError.message : "编码失败");
    }
  }

  function handleDecode() {
    try {
      const decoded = decodeBase64(input);
      setOutput(decoded);
      setError("");
    } catch (decodeError) {
      setError(decodeError instanceof Error ? decodeError.message : "解码失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Text Workspace</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={handleEncode}>
          编码
        </button>
        <button type="button" onClick={handleDecode}>
          解码
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>输出</span>
          <textarea value={output} onChange={(event) => setOutput(event.target.value)} spellCheck={false} />
        </label>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
