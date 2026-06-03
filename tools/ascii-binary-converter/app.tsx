"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function textToBinary(text: string, separator: string = " "): string {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code > 255) return `[${code.toString(2)}]`;
      return code.toString(2).padStart(8, "0");
    })
    .join(separator);
}

function binaryToText(binary: string): { text: string; error: string } {
  const cleaned = binary.replace(/[^01\s[\]]/g, "");
  // Handle bracketed long binary
  const parts = cleaned.split(/[\s]+/).filter(Boolean);
  let result = "";
  let error = "";

  for (const part of parts) {
    const bits = part.replace(/[[\]]/g, "");
    if (!bits) continue;
    const code = parseInt(bits, 2);
    if (isNaN(code) || code < 0 || code > 0x10FFFF) {
      error = `无效的二进制值: ${part}`;
      continue;
    }
    result += String.fromCharCode(code);
  }

  return { text: result, error };
}

export default function AsciiBinaryConverterTool({ manifest }: ToolAppProps) {
  const [textInput, setTextInput] = useState("Hi!");
  const [binaryOutput, setBinaryOutput] = useState(() => textToBinary("Hi!"));
  const [binaryInput, setBinaryInput] = useState("");
  const [textOutput, setTextOutput] = useState("");
  const [separator, setSeparator] = useState(" ");
  const [decodeError, setDecodeError] = useState("");
  const [copied, setCopied] = useState("");

  function handleTextToBinary() {
    setBinaryOutput(textToBinary(textInput, separator));
    setCopied("");
  }

  function handleBinaryToText() {
    const result = binaryToText(binaryInput);
    setTextOutput(result.text);
    setDecodeError(result.error);
    setCopied("");
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
  }

  const bitCount = textInput.split("").reduce((sum, ch) => {
    return sum + Math.max(8, ch.charCodeAt(0).toString(2).length);
  }, 0);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">二进制编码</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--two-column">
        <div>
          <label className="tool-field">
            <span>文本</span>
            <textarea
              value={textInput}
              onChange={(e) => { setTextInput(e.target.value); setCopied(""); }}
              placeholder="输入文本..."
              spellCheck={false}
            />
          </label>
          <div className="tool-toolbar" style={{ marginTop: "8px" }}>
            <label className="tool-field tool-field--compact">
              <span>分隔符</span>
              <select value={separator} onChange={(e) => setSeparator(e.target.value === "none" ? "" : e.target.value)}>
                <option value=" ">空格</option>
                <option value={"\n"}>换行</option>
                <option value=",">逗号</option>
                <option value="none">无</option>
              </select>
            </label>
            <button type="button" className="button--primary" onClick={handleTextToBinary}>
              文本 → 二进制
            </button>
          </div>
          {binaryOutput ? (
            <>
              <label className="tool-field" style={{ marginTop: "8px" }}>
                <span>二进制</span>
                <textarea value={binaryOutput} readOnly spellCheck={false} style={{ fontFamily: "monospace" }} />
              </label>
              <button type="button" onClick={() => void handleCopy(binaryOutput, "bin")}>
                {copied === "bin" ? "已复制" : "复制"}
              </button>
            </>
          ) : null}
        </div>

        <div>
          <label className="tool-field">
            <span>二进制</span>
            <textarea
              value={binaryInput}
              onChange={(e) => { setBinaryInput(e.target.value); setCopied(""); }}
              placeholder="如 01001000 01101001..."
              spellCheck={false}
              style={{ fontFamily: "monospace" }}
            />
          </label>
          <button type="button" className="button--primary" onClick={handleBinaryToText} style={{ marginTop: "8px" }}>
            二进制 → 文本
          </button>
          {textOutput ? (
            <>
              <label className="tool-field" style={{ marginTop: "8px" }}>
                <span>文本</span>
                <input type="text" value={textOutput} readOnly />
              </label>
              <button type="button" onClick={() => void handleCopy(textOutput, "text")}>
                {copied === "text" ? "已复制" : "复制"}
              </button>
            </>
          ) : null}
          {decodeError ? <p className="tool-error">{decodeError}</p> : null}
        </div>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>字符数</h3>
          <p>{textInput.length}</p>
        </article>
        <article className="detail-card">
          <h3>总位数</h3>
          <p>{bitCount}</p>
        </article>
        <article className="detail-card">
          <h3>字节数</h3>
          <p>{new TextEncoder().encode(textInput).byteLength}</p>
        </article>
      </div>

      <p className="tool-note">
        标准 ASCII 字符使用 8 位二进制表示。超出 ASCII 范围的字符（如中文）将使用更多位数并以方括号标记。
      </p>
    </section>
  );
}
