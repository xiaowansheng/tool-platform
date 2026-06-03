"use client";

import { useState, useEffect, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { TextEncoder as LegacyEncoder, TextDecoder as LegacyDecoder } from "@kayahr/text-encoding";

// Allowed encodings list
const ENCODING_OPTIONS = [
  { value: "utf-8", label: "UTF-8 (通用 Unicode)", description: "现代网络与系统的标准编码格式" },
  { value: "gbk", label: "GBK / GB2312 (中文简体)", description: "中国大陆旧系统与 Windows 文件常用编码" },
  { value: "big5", label: "Big5 (繁体中文)", description: "中国台湾、香港及海外繁体常用编码" },
  { value: "utf-16le", label: "UTF-16 LE (Unicode 16位小端)", description: "Windows 文本文件（Unicode格式）常用" },
  { value: "utf-16be", label: "UTF-16 BE (Unicode 16位大端)", description: "网络传输或特定平台使用的16位编码" },
  { value: "ascii", label: "ASCII (基础英文字符)", description: "仅支持基础英文、数字和常用控制字符" },
  { value: "iso-8859-1", label: "ISO-8859-1 (Latin-1 西欧)", description: "西方单字节编码，也常作为字节传输桥梁" }
];

// Byte representation formats
type ByteFormat = "hex" | "base64" | "decimal" | "binary";

// Quick presets for Mojibake Repair
const MOJIBAKE_PRESETS = [
  { name: "GBK 误读为 UTF-8 (常见于中文记事本)", read: "utf-8", orig: "gbk", test: "浣犲ソ锛屾 Elis 宸ヤ綔瀹わ紒" },
  { name: "UTF-8 误读为 ISO-8859-1 (常见于旧网页)", read: "iso-8859-1", orig: "utf-8", test: "æåæ¯æ°ç¢码è¾¹ç" },
  { name: "Big5 误读为 UTF-8 (常见于繁体文本)", read: "utf-8", orig: "big5", test: "斕恅眳儂" }
];

// Heuristic scorer to rate how "readable" a repaired string is
function calculateLegibilityScore(text: string): number {
  if (!text || text.trim() === "") return 0;
  
  let chineseCount = 0;
  let punctuationCount = 0;
  let letterNumCount = 0;
  let invalidCount = 0; //  or weird control chars

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const char = text[i];

    if (char === "\ufffd" || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      invalidCount += 8; // Heavy penalty for  and raw control chars
    } else if (code >= 0x4e00 && code <= 0x9fa5) {
      chineseCount += 3; // Large reward for CJK Characters
    } else if (/[\u3000-\u303f\uff00-\uffef]/.test(char)) {
      punctuationCount += 1.5; // Chinese punctuation
    } else if (/[a-zA-Z0-9]/.test(char)) {
      letterNumCount += 0.5; // English letters and numbers
    }
  }

  // Calculate final density score
  const totalWeight = chineseCount + punctuationCount + letterNumCount - invalidCount;
  return Math.max(0, totalWeight);
}

// Convert bytes array to string format
function bytesToFormattedString(bytes: Uint8Array, format: ByteFormat): string {
  if (format === "base64") {
    // Binary string conversion
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const val = bytes[i];
    if (format === "hex") {
      parts.push(val.toString(16).toUpperCase().padStart(2, "0"));
    } else if (format === "decimal") {
      parts.push(val.toString(10));
    } else if (format === "binary") {
      parts.push(val.toString(2).padStart(8, "0"));
    }
  }

  return parts.join(format === "hex" ? " " : ", ");
}

// Parse formatted string back to Uint8Array bytes
function parseStringToBytes(input: string, format: ByteFormat): Uint8Array | null {
  const trimmed = input.trim();
  if (!trimmed) return new Uint8Array(0);

  try {
    if (format === "base64") {
      const binaryString = atob(trimmed);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }

    // Split decimal, hex, or binary formats
    const separator = /[\s,;\-]+/;
    const tokens = trimmed.split(separator).filter(Boolean);
    const bytes = new Uint8Array(tokens.length);

    for (let i = 0; i < tokens.length; i++) {
      let val = 0;
      if (format === "hex") {
        val = parseInt(tokens[i], 16);
      } else if (format === "decimal") {
        val = parseInt(tokens[i], 10);
      } else if (format === "binary") {
        val = parseInt(tokens[i], 2);
      }

      if (isNaN(val) || val < 0 || val > 255) {
        return null; // Invalid byte range
      }
      bytes[i] = val;
    }
    return bytes;
  } catch {
    return null;
  }
}

export default function TextEncodingConverterTool({ manifest }: ToolAppProps) {
  // Tabs: "converter" (Normal encoding conversion) or "mojibake" (Messed-up code repair)
  const [activeTab, setActiveTab] = useState<"converter" | "mojibake">("converter");

  // Tab 1: Normal Converter States
  const [inputText, setInputText] = useState("你好，世界！Hello, World! 123");
  const [inputEncoding, setInputEncoding] = useState("utf-8");
  const [byteFormat, setByteFormat] = useState<ByteFormat>("hex");
  const [byteOutput, setByteOutput] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Tab 2: Mojibake States
  const [corruptedText, setCorruptedText] = useState("浣犲ソ锛屾 Elis 宸ヤ綔瀹わ紒");
  const [readEncoding, setReadEncoding] = useState("utf-8");
  const [origEncoding, setOrigEncoding] = useState("gbk");
  const [repairedText, setRepairedText] = useState("");

  const [copied, setCopied] = useState(false);
  const [copiedBytes, setCopiedBytes] = useState(false);
  const [copiedRepaired, setCopiedRepaired] = useState(false);

  // Sync Text -> Bytes
  const syncTextToBytes = (text: string, encoding: string, format: ByteFormat) => {
    if (!text) {
      setByteOutput("");
      return;
    }
    try {
      const encoder = new LegacyEncoder(encoding);
      const bytes = encoder.encode(text);
      const formatted = bytesToFormattedString(bytes, format);
      setByteOutput(formatted);
    } catch (e) {
      console.warn(e);
      setByteOutput("【编码失败，所选字符集可能不支持此字符】");
    }
  };

  // Sync Bytes -> Text
  const syncBytesToText = (bytesStr: string, encoding: string, format: ByteFormat) => {
    if (!bytesStr) {
      setInputText("");
      return;
    }
    const bytes = parseStringToBytes(bytesStr, format);
    if (!bytes) {
      // Don't update input text with error yet to allow typing, just keep previous or show error in helper
      return;
    }
    try {
      const decoder = new LegacyDecoder(encoding, { fatal: false });
      const text = decoder.decode(bytes as any);
      setInputText(text);
    } catch (e) {
      console.warn(e);
    }
  };

  // Run synchronization on inputs
  useEffect(() => {
    if (activeTab === "converter" && !isSyncing) {
      syncTextToBytes(inputText, inputEncoding, byteFormat);
    }
  }, [inputText, inputEncoding, byteFormat, activeTab]);

  const handleByteOutputChange = (e: string) => {
    setByteOutput(e);
    setIsSyncing(true);
    syncBytesToText(e, inputEncoding, byteFormat);
    // Release lock in next tick
    setTimeout(() => setIsSyncing(false), 0);
  };

  // Repair Mojibake Text
  const performMojibakeRepair = (text: string, readEnc: string, origEnc: string) => {
    if (!text) {
      setRepairedText("");
      return;
    }
    try {
      // 1. Re-encode the read string to bytes using the readEncoding (which originally misread it)
      const encoder = new LegacyEncoder(readEnc);
      const bytes = encoder.encode(text);
      
      // 2. Decode the bytes back using the correct original encoding
      const decoder = new LegacyDecoder(origEnc, { fatal: false });
      const repaired = decoder.decode(bytes as any);
      setRepairedText(repaired);
    } catch (e) {
      console.warn("Repair failed:", e);
      setRepairedText("【修复失败，编码解析出故障】");
    }
  };

  useEffect(() => {
    if (activeTab === "mojibake") {
      performMojibakeRepair(corruptedText, readEncoding, origEncoding);
    }
  }, [corruptedText, readEncoding, origEncoding, activeTab]);

  // Run Permutation Scan suggestions for Mojibake
  const scanSuggestions = useMemo(() => {
    if (!corruptedText || activeTab !== "mojibake") return [];
    
    const results: { readEnc: string; origEnc: string; text: string; score: number }[] = [];
    const list = ENCODING_OPTIONS.map(o => o.value);

    for (const readEnc of list) {
      for (const origEnc of list) {
        if (readEnc === origEnc) continue;
        try {
          const encoder = new LegacyEncoder(readEnc);
          const bytes = encoder.encode(corruptedText);
          
          const decoder = new LegacyDecoder(origEnc, { fatal: false });
          const repaired = decoder.decode(bytes as any);

          // Calculate legibility score
          const score = calculateLegibilityScore(repaired);
          if (score > 1) { // Filter out purely garbage values
            results.push({ readEnc, origEnc, text: repaired, score });
          }
        } catch {
          // Ignore failed conversions
        }
      }
    }

    // Sort by legibility score descending
    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [corruptedText, activeTab]);

  const copyToClipboard = async (text: string, type: "input" | "bytes" | "repaired") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (type === "input") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else if (type === "bytes") {
        setCopiedBytes(true);
        setTimeout(() => setCopiedBytes(false), 2000);
      } else {
        setCopiedRepaired(true);
        setTimeout(() => setCopiedRepaired(false), 2000);
      }
    } catch (err) {
      console.warn("Failed to copy:", err);
    }
  };

  const getEncodingLabel = (val: string) => {
    return ENCODING_OPTIONS.find(o => o.value === val)?.label.split(" ")[0] || val.toUpperCase();
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

      {/* Tab Navigation */}
      <div className="tab-container" style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => setActiveTab("converter")}
          style={{
            padding: "0.75rem 1.2rem",
            fontSize: "0.95rem",
            fontWeight: activeTab === "converter" ? 600 : 400,
            color: activeTab === "converter" ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: activeTab === "converter" ? "2px solid var(--accent)" : "2px solid transparent",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer"
          }}
        >
          🔄 字符与字节转换
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("mojibake")}
          style={{
            padding: "0.75rem 1.2rem",
            fontSize: "0.95rem",
            fontWeight: activeTab === "mojibake" ? 600 : 400,
            color: activeTab === "mojibake" ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: activeTab === "mojibake" ? "2px solid var(--accent)" : "2px solid transparent",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer"
          }}
        >
          🩹 乱码修复与扫描
        </button>
      </div>

      {/* Tab 1: Converter workspace */}
      {activeTab === "converter" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {/* Controls toolbar */}
          <div 
            className="tool-toolbar"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.2rem",
              alignItems: "center",
              background: "var(--bg-muted)",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid var(--border)"
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "220px", flex: 1 }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>目标字符编码</label>
              <select
                value={inputEncoding}
                onChange={(e) => setInputEncoding(e.target.value)}
                className="tool-field"
                style={{ padding: "0.45rem", borderRadius: "6px" }}
              >
                {ENCODING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "160px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>字节展现格式</label>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                {(["hex", "base64", "decimal", "binary"] as ByteFormat[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setByteFormat(f)}
                    className={byteFormat === f ? "button--primary" : "button--secondary"}
                    style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem", textTransform: "capitalize" }}
                  >
                    {f === "decimal" ? "Dec" : f === "binary" ? "Bin" : f}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="button--danger"
              style={{ alignSelf: "flex-end", height: "36px" }}
              onClick={() => { setInputText(""); setByteOutput(""); }}
              disabled={!inputText && !byteOutput}
            >
              🧹 清空
            </button>
          </div>

          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", paddingLeft: "0.25rem", marginTop: "-0.5rem" }}>
            ℹ️ <b>所选编码说明：</b> {ENCODING_OPTIONS.find(o => o.value === inputEncoding)?.description}
          </div>

          {/* Dual Input/Output Workspace */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            
            {/* Text Side */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>原文字符串 (String)</span>
                <button
                  type="button"
                  className="button--secondary"
                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                  onClick={() => copyToClipboard(inputText, "input")}
                  disabled={!inputText}
                >
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="在此输入需要转换编码的纯文本..."
                spellCheck={false}
                style={{
                  width: "100%",
                  height: "260px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0.8rem",
                  fontSize: "0.95rem",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  lineHeight: "1.6",
                  resize: "vertical",
                  outline: "none"
                }}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                字符串长度: {inputText.length} 字符
              </div>
            </div>

            {/* Bytes Side */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  字节序列 ({byteFormat.toUpperCase()} 字节流)
                </span>
                <button
                  type="button"
                  className="button--secondary"
                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                  onClick={() => copyToClipboard(byteOutput, "bytes")}
                  disabled={!byteOutput}
                >
                  {copiedBytes ? "已复制" : "复制"}
                </button>
              </div>
              <textarea
                value={byteOutput}
                onChange={(e) => handleByteOutputChange(e.target.value)}
                placeholder={
                  byteFormat === "hex"
                    ? "输入以空格分隔的十六进制字节流，例如：E4 BD A0 E5 A5 BD"
                    : byteFormat === "decimal"
                    ? "输入以逗号/空格分隔的十进制字节流，例如：228, 189, 160"
                    : "粘贴您的 Base64 字符串或二进制字符串..."
                }
                spellCheck={false}
                style={{
                  width: "100%",
                  height: "260px",
                  background: "var(--bg-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0.8rem",
                  fontSize: "0.95rem",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  lineHeight: "1.6",
                  resize: "vertical",
                  outline: "none"
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                <span>二进制流支持实时双向修改编辑。</span>
                {byteOutput && !parseStringToBytes(byteOutput, byteFormat) && (
                  <span style={{ color: "orange" }}>⚠️ 字节格式无效</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Mojibake Repair workspace */}
      {activeTab === "mojibake" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Quick Presets */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>快捷样例:</span>
            {MOJIBAKE_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="button--secondary"
                style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                onClick={() => {
                  setCorruptedText(preset.test);
                  setReadEncoding(preset.read);
                  setOrigEncoding(preset.orig);
                }}
              >
                {preset.name.split(" ")[0]} 乱码
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            
            {/* Input panel & manual setting */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>输入乱码文本</span>
                <textarea
                  value={corruptedText}
                  onChange={(e) => setCorruptedText(e.target.value)}
                  placeholder="在此粘入需要修复的乱码字符串（例如：浣犲ソ）..."
                  spellCheck={false}
                  style={{
                    width: "100%",
                    height: "140px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "0.6rem",
                    fontSize: "0.95rem",
                    color: "var(--text-primary)",
                    lineHeight: "1.5",
                    outline: "none",
                    resize: "vertical"
                  }}
                />
              </div>

              {/* Manual Repair Selectors */}
              <div 
                className="detail-card" 
                style={{ 
                  padding: "1rem", 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "0.8rem",
                  border: "1px solid var(--border)"
                }}
              >
                <h3 style={{ margin: 0, fontSize: "0.95rem" }}>⚙️ 手动设置修复对</h3>
                
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>系统读取编码方式 (Read As)</label>
                    <select
                      value={readEncoding}
                      onChange={(e) => setReadEncoding(e.target.value)}
                      className="tool-field"
                      style={{ padding: "0.4rem", fontSize: "0.85rem" }}
                    >
                      {ENCODING_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{getEncodingLabel(o.value)}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>实际文件保存编码 (Original)</label>
                    <select
                      value={origEncoding}
                      onChange={(e) => setOrigEncoding(e.target.value)}
                      className="tool-field"
                      style={{ padding: "0.4rem", fontSize: "0.85rem" }}
                    >
                      {ENCODING_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{getEncodingLabel(o.value)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                  💡 修复流程：将乱码字用<b>「读取编码」</b>恢复成原始字节，再用<b>「实际编码」</b>重新解码输出。
                </div>
              </div>
            </div>

            {/* Smart suggestions & Output */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              {/* Output block */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>修复后预览</span>
                  <button
                    type="button"
                    className="button--secondary"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    onClick={() => copyToClipboard(repairedText, "repaired")}
                    disabled={!repairedText}
                  >
                    {copiedRepaired ? "已复制" : "复制修复结果"}
                  </button>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "140px",
                    background: "var(--bg-muted)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "0.8rem",
                    fontSize: "1rem",
                    color: "var(--accent)",
                    lineHeight: "1.6",
                    overflowY: "auto",
                    fontWeight: 500,
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {repairedText || "（暂无修复输出，请输入乱码文本）"}
                </div>
              </div>

              {/* Smart permuted scan finder */}
              <div className="detail-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  🔍 智能乱码修复推荐 (排列扫描器)
                </h3>
                
                {scanSuggestions.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {scanSuggestions.map((item, idx) => (
                      <div 
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          padding: "0.4rem 0.6rem",
                          fontSize: "0.8rem"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                            把 【{getEncodingLabel(item.readEnc)}】 误认为 【{getEncodingLabel(item.origEnc)}】
                          </span>
                          <span style={{ color: "var(--text-primary)", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "240px" }}>
                            ➔ 「{item.text}」
                          </span>
                        </div>
                        <button
                          type="button"
                          className="button--secondary"
                          style={{ padding: "0.2rem 0.4rem", fontSize: "0.7rem" }}
                          onClick={() => {
                            setReadEncoding(item.readEnc);
                            setOrigEncoding(item.origEnc);
                          }}
                        >
                          应用参数
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                    未发现高可信度的乱码匹配规则，请在左侧手动切换编码测试。
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explanatory notes */}
      <div className="tool-note" style={{ marginTop: "1.5rem" }}>
        💡 <b>关于中文乱码的常见起源：</b>
        <ul style={{ margin: "0.4rem 0 0 1rem", padding: 0 }}>
          <li><b>记事本乱码 (浣犲ソ):</b> 简体中文 GBK 编码的文件被当作 UTF-8 打开，汉字双字节合并解析变成错误的 UTF-8 字符。</li>
          <li><b>问号乱码 ( / ??):</b> 大量无法解析的字节被替换成了 Unicode 替换字符 `` (Code: 0xFFFD)，有些由于经过反复转码或流存储，已造成原始数据永久性丢失，此种情况难以修复。</li>
        </ul>
      </div>
    </section>
  );
}
