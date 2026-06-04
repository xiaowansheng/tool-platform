"use client";

import React, { useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface PDFMeta {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string;
  modDate: string;
  rawInfoDict: string;
  hasXmp: boolean;
  xmpRaw: string;
}

function bytesToBinaryString(bytes: Uint8Array) {
  let output = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    output += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return output;
}

function binaryStringToBytes(input: string) {
  const bytes = new Uint8Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    bytes[index] = input.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function parsePdfDate(dateStr: string): string {
  if (!dateStr) return "";
  const cleaned = dateStr.replace(/[()]/g, "").trim();
  // Format: D:20260604145022Z or D:20260604145022+08'00'
  const match = cleaned.match(/^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (match) {
    const [_, y, m, d, hh, mm, ss] = match;
    let tz = "";
    if (cleaned.includes("+")) {
      const tzMatch = cleaned.match(/\+(\d{2})\'?(\d{2})\'?/);
      if (tzMatch) tz = ` (GMT+${tzMatch[1]}:${tzMatch[2] || "00"})`;
    } else if (cleaned.includes("-")) {
      const tzMatch = cleaned.match(/\-(\d{2})\'?(\d{2})\'?/);
      if (tzMatch) tz = ` (GMT-${tzMatch[1]}:${tzMatch[2] || "00"})`;
    } else if (cleaned.endsWith("Z")) {
      tz = " (UTC)";
    }
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}${tz}`;
  }
  return cleaned;
}

export default function PdfMetadataTool({ manifest }: ToolAppProps) {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<PDFMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cleanedFileUrl, setCleanedFileUrl] = useState<string | null>(null);
  const [rawBinary, setRawBinary] = useState<string>("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setMeta(null);
    setError("");
    setCleanedFileUrl(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const binaryText = bytesToBinaryString(new Uint8Array(buffer));
        setRawBinary(binaryText);

        // 1. Check valid PDF head
        if (!binaryText.startsWith("%PDF-")) {
          throw new Error("无效的 PDF 文件，文件头不匹配。");
        }

        // 2. Parse XMP XML block
        let xmpRaw = "";
        let hasXmp = false;
        const xmpStartIdx = binaryText.indexOf("<?xpacket begin");
        if (xmpStartIdx !== -1) {
          const xmpEndIdx = binaryText.indexOf("<?xpacket end", xmpStartIdx);
          if (xmpEndIdx !== -1) {
            hasXmp = true;
            // Include end packet markers
            const closingBraceIdx = binaryText.indexOf("?>", xmpEndIdx);
            xmpRaw = binaryText.slice(xmpStartIdx, closingBraceIdx !== -1 ? closingBraceIdx + 2 : xmpEndIdx + 20);
          }
        }

        // 3. Search Info dictionaries
        // PDF metadata is usually in the format: /Info 12 0 R
        // We find the referenced object e.g., "12 0 obj" containing a dictionary << ... >>
        let infoDictContent = "";
        const infoRefMatch = binaryText.match(/\/Info\s+(\d+)\s+(\d+)\s+R/);
        if (infoRefMatch) {
          const objNum = infoRefMatch[1];
          const genNum = infoRefMatch[2];
          const objPattern = new RegExp(`${objNum}\\s+${genNum}\\s+obj\\b([\\s\\S]*?)\\bendobj`);
          const objMatch = binaryText.match(objPattern);
          if (objMatch) {
            infoDictContent = objMatch[1];
          }
        }

        // If not found via direct reference, scan any object dictionary for common info properties
        if (!infoDictContent) {
          const dictMatch = binaryText.match(/<<[^>]*\/Producer[^>]*>>/);
          if (dictMatch) {
            infoDictContent = dictMatch[0];
          }
        }

        // 4. Helper function to extract metadata fields from info dictionary
        const extractField = (fieldKey: string): string => {
          if (!infoDictContent) return "";
          // Matches e.g., /Title (My Book) or /Title<FEFF004D0079>
          const escapedKey = fieldKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
          
          // Try literal string match: ( ... )
          // Need to handle escaped parentheses, but basic match covers 95%
          const parenRegex = new RegExp(`${escapedKey}\\s*\\(([^)]*)\\)`);
          const parenMatch = infoDictContent.match(parenRegex);
          if (parenMatch) return parenMatch[1];

          // Try hex string match: < ... >
          const hexRegex = new RegExp(`${escapedKey}\\s*<([^>]*)>`);
          const hexMatch = infoDictContent.match(hexRegex);
          if (hexMatch) {
            try {
              // Decode hex (handle UTF-16 BE if present)
              const hexVal = hexMatch[1].trim();
              if (hexVal.startsWith("FEFF") || hexVal.startsWith("feff")) {
                let decoded = "";
                for (let k = 4; k < hexVal.length; k += 4) {
                  const charCode = parseInt(hexVal.substring(k, k + 4), 16);
                  if (!isNaN(charCode)) decoded += String.fromCharCode(charCode);
                }
                return decoded;
              } else {
                let decoded = "";
                for (let k = 0; k < hexVal.length; k += 2) {
                  const charCode = parseInt(hexVal.substring(k, k + 2), 16);
                  if (!isNaN(charCode)) decoded += String.fromCharCode(charCode);
                }
                return decoded;
              }
            } catch {
              return hexMatch[1];
            }
          }

          return "";
        };

        setMeta({
          title: extractField("/Title"),
          author: extractField("/Author"),
          subject: extractField("/Subject"),
          keywords: extractField("/Keywords"),
          creator: extractField("/Creator"),
          producer: extractField("/Producer"),
          creationDate: parsePdfDate(extractField("/CreationDate")),
          modDate: parsePdfDate(extractField("/ModDate")),
          rawInfoDict: infoDictContent.trim(),
          hasXmp,
          xmpRaw
        });

      } catch (err) {
        setError(err instanceof Error ? err.message : "解析 PDF 失败");
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("读取文件失败。");
      setLoading(false);
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  // Replace metadata values and XMP stream with empty space to preserve offsets
  const cleanMetadata = () => {
    if (!rawBinary || !file) return;

    let cleanedText = rawBinary;

    // 1. Redact XMP streams
    let xmpStartIdx = cleanedText.indexOf("<?xpacket begin");
    while (xmpStartIdx !== -1) {
      const xmpEndIdx = cleanedText.indexOf("<?xpacket end", xmpStartIdx);
      if (xmpEndIdx === -1) break;

      const closingBraceIdx = cleanedText.indexOf("?>", xmpEndIdx);
      if (closingBraceIdx === -1) break;

      const endLimit = closingBraceIdx + 2;
      const length = endLimit - xmpStartIdx;

      // Replace the inner content with spaces to keep offsets identical
      // Keeps <?xpacket begin...?> and <?xpacket end...?> intact, spaces out the XML
      const firstLineEnd = cleanedText.indexOf("?>", xmpStartIdx) + 2;
      const lastLineStart = cleanedText.lastIndexOf("<", endLimit - 1);
      
      if (firstLineEnd !== -1 && lastLineStart !== -1 && lastLineStart > firstLineEnd) {
        const replaceLength = lastLineStart - firstLineEnd;
        const spaces = " ".repeat(replaceLength);
        cleanedText = 
          cleanedText.substring(0, firstLineEnd) + 
          spaces + 
          cleanedText.substring(lastLineStart);
      }

      // Check next occurrences
      xmpStartIdx = cleanedText.indexOf("<?xpacket begin", endLimit);
    }

    // 2. Clean standard Info dictionary attributes
    // Find '/Info' object ID
    const infoRefMatch = cleanedText.match(/\/Info\s+(\d+)\s+(\d+)\s+R/);
    if (infoRefMatch) {
      const objNum = infoRefMatch[1];
      const genNum = infoRefMatch[2];
      const objPattern = new RegExp(`(${objNum}\\s+${genNum}\\s+obj\\b[\\s\\S]*?<<)([\\s\\S]*?)(>>\\s*endobj)`);
      const objMatch = cleanedText.match(objPattern);
      
      if (objMatch) {
        let dictBody = objMatch[2];
        const keysToClean = ["Title", "Author", "Subject", "Keywords", "Creator", "Producer", "CreationDate", "ModDate"];
        
        for (const key of keysToClean) {
          // Replace string contents with empty e.g. /Author (John) -> /Author ()
          const parenRegex = new RegExp(`(/${key}\\s*\\()[^)]*(\\))`, "g");
          dictBody = dictBody.replace(parenRegex, "$1$2");

          // Replace hex values e.g. /Author <FEFF...> -> /Author <>
          const hexRegex = new RegExp(`(/${key}\\s*<)[^>]*((?:>))`, "g");
          dictBody = dictBody.replace(hexRegex, "$1$2");
        }

        cleanedText = cleanedText.replace(objPattern, `$1${dictBody}$3`);
      }
    }

    // Convert back to ArrayBuffer/Blob
    const cleanedBytes = binaryStringToBytes(cleanedText);
    const blob = new Blob([cleanedBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setCleanedFileUrl(url);
  };

  const triggerDownload = () => {
    if (!cleanedFileUrl || !file) return;
    const a = document.createElement("a");
    a.href = cleanedFileUrl;
    // Prefix cleaned file name
    const originalName = file.name;
    const extIdx = originalName.lastIndexOf(".");
    const baseName = extIdx !== -1 ? originalName.substring(0, extIdx) : originalName;
    const extension = extIdx !== -1 ? originalName.substring(extIdx) : ".pdf";
    a.download = `${baseName}-cleaned${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文件工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--two-column" style={{ gap: "24px" }}>
        {/* Left Column: File upload & parsed Info dict */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label className="tool-field">
            <span>选择 PDF 文件</span>
            <input type="file" accept=".pdf" onChange={handleFileUpload} />
          </label>

          {loading && (
            <p style={{ textAlign: "center", opacity: 0.6, padding: "20px" }}>正在读取和解析 PDF 元数据...</p>
          )}

          {error && <p className="tool-error">{error}</p>}

          {meta && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600 }}>PDF Info 字典属性</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px", fontSize: "14px" }}>
                <span style={{ opacity: 0.7 }}>标题 (Title):</span>
                <strong>{meta.title || <span style={{ fontStyle: "italic", opacity: 0.5 }}>无</span>}</strong>

                <span style={{ opacity: 0.7 }}>作者 (Author):</span>
                <strong>{meta.author || <span style={{ fontStyle: "italic", opacity: 0.5 }}>无</span>}</strong>

                <span style={{ opacity: 0.7 }}>主题 (Subject):</span>
                <strong>{meta.subject || <span style={{ fontStyle: "italic", opacity: 0.5 }}>无</span>}</strong>

                <span style={{ opacity: 0.7 }}>关键字:</span>
                <strong>{meta.keywords || <span style={{ fontStyle: "italic", opacity: 0.5 }}>无</span>}</strong>

                <span style={{ opacity: 0.7 }}>创建工具:</span>
                <strong>{meta.creator || <span style={{ fontStyle: "italic", opacity: 0.5 }}>无</span>}</strong>

                <span style={{ opacity: 0.7 }}>PDF 生产商:</span>
                <strong>{meta.producer || <span style={{ fontStyle: "italic", opacity: 0.5 }}>无</span>}</strong>

                <span style={{ opacity: 0.7 }}>创建时间:</span>
                <strong>{meta.creationDate || <span style={{ fontStyle: "italic", opacity: 0.5 }}>无</span>}</strong>

                <span style={{ opacity: 0.7 }}>修改时间:</span>
                <strong>{meta.modDate || <span style={{ fontStyle: "italic", opacity: 0.5 }}>无</span>}</strong>
              </div>

              <div style={{ marginTop: "12px" }}>
                <button
                  type="button"
                  className="button--primary"
                  onClick={cleanMetadata}
                  style={{ width: "100%", padding: "10px" }}
                >
                  🧹 清除文档元数据 (Info & XMP)
                </button>
              </div>

              {cleanedFileUrl && (
                <div
                  style={{
                    backgroundColor: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    borderRadius: "8px",
                    padding: "16px",
                    textAlign: "center",
                    marginTop: "8px"
                  }}
                >
                  <p style={{ color: "#047857", fontWeight: 600, marginBottom: "8px", fontSize: "14px" }}>
                    ✓ 元数据已成功清除 (保留原有字节偏移)
                  </p>
                  <button
                    type="button"
                    onClick={triggerDownload}
                    style={{ backgroundColor: "#10b981", color: "#fff", border: 0, padding: "8px 16px", borderRadius: "4px" }}
                  >
                    📥 下载已脱敏 PDF 文件
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: XML metadata display */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600 }}>XMP (XML) 元数据流</h3>
          
          {meta ? (
            meta.hasXmp ? (
              <label className="tool-field" style={{ flex: 1 }}>
                <span>XMP XML 流数据</span>
                <textarea
                  value={meta.xmpRaw}
                  readOnly
                  style={{
                    fontFamily: "monospace",
                    fontSize: "12px",
                    lineHeight: "1.4",
                    minHeight: "350px",
                    backgroundColor: "rgba(0,0,0,0.03)"
                  }}
                />
              </label>
            ) : (
              <p style={{ opacity: 0.6, fontSize: "14px", fontStyle: "italic" }}>
                该 PDF 文件未包含标准的 XMP 元数据流数据。
              </p>
            )
          ) : (
            <p style={{ opacity: 0.6, fontSize: "14px" }}>上传 PDF 文件后，此处将展示其内部嵌入的 XML 结构数据。</p>
          )}
        </div>
      </div>

      {meta && (
        <div className="detail-grid" style={{ marginTop: "24px" }}>
          <article className="detail-card">
            <h3>原文件大小</h3>
            <p>{(file!.size / 1024).toFixed(1)} KB</p>
          </article>
          <article className="detail-card">
            <h3>XMP 元数据</h3>
            <p>{meta.hasXmp ? "已嵌入" : "无"}</p>
          </article>
          <article className="detail-card">
            <h3>原始 Info 键值数</h3>
            <p>
              {meta.rawInfoDict
                ? (meta.rawInfoDict.match(/\/[a-zA-Z]+/g) || []).length
                : 0}{" "}
              个
            </p>
          </article>
        </div>
      )}
    </section>
  );
}
