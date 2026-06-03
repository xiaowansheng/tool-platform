"use client";

import { useState, useEffect } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const SAMPLE_TEXT = "Tool Platform ✨ 极客工具";

function encodeUnicode(str: string): string {
  return Array.from(str).map(c => {
    const code = c.charCodeAt(0);
    return code > 127 ? `\\u${code.toString(16).padStart(4, "0")}` : c;
  }).join("");
}

function decodeUnicode(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return `\\u${hex}`;
    }
  });
}

function encodeCss(str: string): string {
  return Array.from(str).map(c => {
    const code = c.charCodeAt(0);
    return code > 127 ? `\\${code.toString(16).padStart(4, "0")}` : c;
  }).join("");
}

function decodeCss(str: string): string {
  return str.replace(/\\([0-9a-fA-F]{4})/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return `\\${hex}`;
    }
  });
}

function encodeHtmlDec(str: string): string {
  return Array.from(str).map(c => {
    const code = c.charCodeAt(0);
    return code > 127 ? `&#${code};` : c;
  }).join("");
}

function decodeHtmlDec(str: string): string {
  return str.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch {
      return `&#${dec};`;
    }
  });
}

function encodeHtmlHex(str: string): string {
  return Array.from(str).map(c => {
    const code = c.charCodeAt(0);
    return code > 127 ? `&#x${code.toString(16).padStart(4, "0")};` : c;
  }).join("");
}

function decodeHtmlHex(str: string): string {
  return str.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return `&#x${hex};`;
    }
  });
}

function encodeUrl(str: string): string {
  try {
    return encodeURIComponent(str);
  } catch {
    return str;
  }
}

function decodeUrl(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

function encodeUtf8Hex(str: string): string {
  return Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

function decodeUtf8Hex(str: string): string {
  try {
    const clean = str.trim().replace(/[^0-9a-fA-F\s]/g, "");
    if (!clean) return "";
    const bytes = new Uint8Array(
      clean.split(/\s+/).map(h => parseInt(h, 16)).filter(n => !isNaN(n))
    );
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function encodeUtf16Hex(str: string): string {
  const hex: string[] = [];
  for (let i = 0; i < str.length; i++) {
    hex.push(str.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0"));
  }
  return hex.join(" ");
}

function decodeUtf16Hex(str: string): string {
  try {
    const clean = str.trim().replace(/[^0-9a-fA-F\s]/g, "");
    if (!clean) return "";
    const codes = clean.split(/\s+/).map(h => parseInt(h, 16)).filter(n => !isNaN(n));
    return String.fromCharCode(...codes);
  } catch {
    return "";
  }
}

export default function UnicodeConverterTool({ manifest }: ToolAppProps) {
  const [nativeText, setNativeText] = useState(SAMPLE_TEXT);
  const [unicodeText, setUnicodeText] = useState("");
  const [cssText, setCssText] = useState("");
  const [htmlDecText, setHtmlDecText] = useState("");
  const [htmlHexText, setHtmlHexText] = useState("");
  const [urlText, setUrlText] = useState("");
  const [utf8Text, setUtf8Text] = useState("");
  const [utf16Text, setUtf16Text] = useState("");

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Synchronize all encoding values when Native Text changes
  const updateAllEncodings = (sourceNative: string) => {
    setUnicodeText(encodeUnicode(sourceNative));
    setCssText(encodeCss(sourceNative));
    setHtmlDecText(encodeHtmlDec(sourceNative));
    setHtmlHexText(encodeHtmlHex(sourceNative));
    setUrlText(encodeUrl(sourceNative));
    setUtf8Text(encodeUtf8Hex(sourceNative));
    setUtf16Text(encodeUtf16Hex(sourceNative));
  };

  useEffect(() => {
    updateAllEncodings(nativeText);
  }, [nativeText]);

  const copyToClipboard = async (content: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  // Sync handlers for editing other encodings
  const handleUnicodeChange = (val: string) => {
    setUnicodeText(val);
    const decoded = decodeUnicode(val);
    setNativeText(decoded);
  };

  const handleCssChange = (val: string) => {
    setCssText(val);
    const decoded = decodeCss(val);
    setNativeText(decoded);
  };

  const handleHtmlDecChange = (val: string) => {
    setHtmlDecText(val);
    const decoded = decodeHtmlDec(val);
    setNativeText(decoded);
  };

  const handleHtmlHexChange = (val: string) => {
    setHtmlHexText(val);
    const decoded = decodeHtmlHex(val);
    setNativeText(decoded);
  };

  const handleUrlChange = (val: string) => {
    setUrlText(val);
    const decoded = decodeUrl(val);
    setNativeText(decoded);
  };

  const handleUtf8Change = (val: string) => {
    setUtf8Text(val);
    const decoded = decodeUtf8Hex(val);
    if (decoded) setNativeText(decoded);
  };

  const handleUtf16Change = (val: string) => {
    setUtf16Text(val);
    const decoded = decodeUtf16Hex(val);
    if (decoded) setNativeText(decoded);
  };

  const handleClear = () => {
    setNativeText("");
    setCopiedField(null);
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本与编码</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Preset Toolbar */}
      <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.2rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
          <button type="button" className="button--secondary" onClick={() => setNativeText(SAMPLE_TEXT)}>
            载入默认示例
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="button--danger" onClick={handleClear}>
            清空内容
          </button>
        </div>
      </div>

      {/* Grid mapping out inputs/outputs */}
      <div
        className="workspace"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "1.2rem"
        }}
      >
        {/* Native Plain text - Large textarea */}
        <label className="tool-field">
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            1. 原生字符 (Native Plain Text)
            <button
              type="button"
              onClick={() => copyToClipboard(nativeText, "native")}
              disabled={!nativeText}
              style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", height: "auto" }}
            >
              {copiedField === "native" ? "已复制" : "复制"}
            </button>
          </span>
          <textarea
            value={nativeText}
            onChange={(e) => setNativeText(e.target.value)}
            placeholder="请在此处输入您的原始文本。在下方任意编码框中修改，此原生字符都会同步解码刷新。"
            spellCheck={false}
            style={{ height: "110px", resize: "vertical" }}
          />
        </label>

        {/* 2 Column Layout for Encodings */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.2rem"
          }}
        >
          {/* Unicode Escape */}
          <label className="tool-field">
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>2. Unicode 转义 (<code>\\uXXXX</code>)</span>
              <button type="button" onClick={() => copyToClipboard(unicodeText, "unicode")} style={{ fontSize: "0.72rem", padding: "0.1rem 0.3rem", height: "auto" }}>
                {copiedField === "unicode" ? "已复制" : "复制"}
              </button>
            </span>
            <input type="text" value={unicodeText} onChange={(e) => handleUnicodeChange(e.target.value)} style={{ fontFamily: "monospace" }} />
          </label>

          {/* CSS Escape */}
          <label className="tool-field">
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>3. CSS 转义 (<code>\\XXXX</code>)</span>
              <button type="button" onClick={() => copyToClipboard(cssText, "css")} style={{ fontSize: "0.72rem", padding: "0.1rem 0.3rem", height: "auto" }}>
                {copiedField === "css" ? "已复制" : "复制"}
              </button>
            </span>
            <input type="text" value={cssText} onChange={(e) => handleCssChange(e.target.value)} style={{ fontFamily: "monospace" }} />
          </label>

          {/* HTML Entity Dec */}
          <label className="tool-field">
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>4. HTML 实体十进制 (<code>&#xxxx;</code>)</span>
              <button type="button" onClick={() => copyToClipboard(htmlDecText, "htmlDec")} style={{ fontSize: "0.72rem", padding: "0.1rem 0.3rem", height: "auto" }}>
                {copiedField === "htmlDec" ? "已复制" : "复制"}
              </button>
            </span>
            <input type="text" value={htmlDecText} onChange={(e) => handleHtmlDecChange(e.target.value)} style={{ fontFamily: "monospace" }} />
          </label>

          {/* HTML Entity Hex */}
          <label className="tool-field">
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>5. HTML 实体十六进制 (<code>&#xxxxx;</code>)</span>
              <button type="button" onClick={() => copyToClipboard(htmlHexText, "htmlHex")} style={{ fontSize: "0.72rem", padding: "0.1rem 0.3rem", height: "auto" }}>
                {copiedField === "htmlHex" ? "已复制" : "复制"}
              </button>
            </span>
            <input type="text" value={htmlHexText} onChange={(e) => handleHtmlHexChange(e.target.value)} style={{ fontFamily: "monospace" }} />
          </label>

          {/* URL Escape */}
          <label className="tool-field">
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>6. URL 百分比编码 (URL Code)</span>
              <button type="button" onClick={() => copyToClipboard(urlText, "url")} style={{ fontSize: "0.72rem", padding: "0.1rem 0.3rem", height: "auto" }}>
                {copiedField === "url" ? "已复制" : "复制"}
              </button>
            </span>
            <input type="text" value={urlText} onChange={(e) => handleUrlChange(e.target.value)} style={{ fontFamily: "monospace" }} />
          </label>

          {/* UTF-8 Hex */}
          <label className="tool-field">
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>7. UTF-8 十六进制 (空格分隔)</span>
              <button type="button" onClick={() => copyToClipboard(utf8Text, "utf8")} style={{ fontSize: "0.72rem", padding: "0.1rem 0.3rem", height: "auto" }}>
                {copiedField === "utf8" ? "已复制" : "复制"}
              </button>
            </span>
            <input type="text" value={utf8Text} onChange={(e) => handleUtf8Change(e.target.value)} style={{ fontFamily: "monospace" }} />
          </label>

          {/* UTF-16 Hex */}
          <label className="tool-field" style={{ gridColumn: "span 1" }}>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>8. UTF-16 十六进制 (空格分隔)</span>
              <button type="button" onClick={() => copyToClipboard(utf16Text, "utf16")} style={{ fontSize: "0.72rem", padding: "0.1rem 0.3rem", height: "auto" }}>
                {copiedField === "utf16" ? "已复制" : "复制"}
              </button>
            </span>
            <input type="text" value={utf16Text} onChange={(e) => handleUtf16Change(e.target.value)} style={{ fontFamily: "monospace" }} />
          </label>
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: "1rem" }}>
        说明：支持在任意文本框内直接编辑或粘贴已编码的内容，转换器会自动判断并将其反向解码，重新刷新其他字段的显示，支持多向交叉同步转换。
      </p>
    </section>
  );
}
