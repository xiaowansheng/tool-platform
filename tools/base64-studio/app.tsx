"use client";

import { useMemo, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleText = "用户名:密码";

// Helpers
function encodeBase64Text(value: string) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

function decodeBase64Text(value: string) {
  const binary = atob(value.trim());
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function detectImageBase64(value: string): { isImage: boolean; previewUrl: string; mimeType: string } {
  const trimmed = value.trim();
  
  // Case 1: Full Data URL
  if (trimmed.startsWith("data:image/")) {
    const match = trimmed.match(/^data:(image\/[^;]+);base64,/);
    if (match) {
      return { isImage: true, previewUrl: trimmed, mimeType: match[1] };
    }
  }

  // Case 2: Raw Base64 string (check signature bytes)
  // PNG: iVBORw0KGgo...
  // JPEG: /9j/...
  // GIF: R0lGOD...
  // SVG: PHN2Z... (starts with <svg)
  // WebP: UklGR...
  const firstChars = trimmed.slice(0, 10);
  let guessedMime = "";
  if (firstChars.startsWith("iVBORw0KGg")) guessedMime = "image/png";
  else if (firstChars.startsWith("/9j/")) guessedMime = "image/jpeg";
  else if (firstChars.startsWith("R0lGOD")) guessedMime = "image/gif";
  else if (firstChars.startsWith("PHN2Z") || firstChars.toLowerCase().startsWith("psd")) guessedMime = "image/svg+xml";
  else if (firstChars.startsWith("UklGR")) guessedMime = "image/webp";

  if (guessedMime) {
    return {
      isImage: true,
      previewUrl: `data:${guessedMime};base64,${trimmed}`,
      mimeType: guessedMime
    };
  }

  return { isImage: false, previewUrl: "", mimeType: "" };
}

export default function Base64StudioTool({ manifest }: ToolAppProps) {
  // Tabs: text (Text conversion) / file (File conversion)
  const [activeTab, setActiveTab] = useState<"text" | "file">("text");

  // Text Tab states
  const [inputText, setInputText] = useState(sampleText);
  const [outputText, setOutputText] = useState(() => encodeBase64Text(sampleText));
  const [textMode, setTextMode] = useState<"encode" | "decode">("encode");
  
  // File Tab states
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    rawBase64: string;
    dataUrl: string;
  } | null>(null);
  
  const [fileOutputFormat, setFileOutputFormat] = useState<"raw" | "dataurl" | "html" | "css">("dataurl");

  // General states
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Compute text statistics
  const textStats = useMemo(() => {
    return {
      inputBytes: new TextEncoder().encode(inputText).byteLength,
      outputChars: outputText.length,
      modeLabel: textMode === "encode" ? "编码" : "解码"
    };
  }, [inputText, textMode, outputText]);

  // Text conversions
  function handleTextEncode() {
    try {
      const encoded = encodeBase64Text(inputText);
      setTextMode("encode");
      setOutputText(encoded);
      setError("");
      setCopied(false);
    } catch (encodeError) {
      setError(encodeError instanceof Error ? encodeError.message : "编码失败");
    }
  }

  function handleTextDecode() {
    try {
      const decoded = decodeBase64Text(inputText);
      setTextMode("decode");
      setOutputText(decoded);
      setError("");
      setCopied(false);
    } catch (decodeError) {
      setError(decodeError instanceof Error ? decodeError.message : "解码失败，请检查输入是否为有效 Base64 字符串");
    }
  }

  // Detect image in Text Output (for decode) or Text Input (for encode/decode)
  const detectedImage = useMemo(() => {
    // If we've decoded something, check if the INPUT was an image Base64
    if (textMode === "decode") {
      return detectImageBase64(inputText);
    }
    // If we're encoding text, check if OUTPUT is an image Base64 (rarely, but possible)
    return detectImageBase64(outputText);
  }, [inputText, outputText, textMode]);

  // Handle local file uploads
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setCopied(false);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // data:image/png;base64,...
      const commaIdx = result.indexOf(",");
      const rawBase64 = result.slice(commaIdx + 1);

      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        rawBase64,
        dataUrl: result
      });
    };
    reader.onerror = () => {
      setError("文件读取出错，请尝试重新选择");
    };
    reader.readAsDataURL(file);
  };

  // Compute file outputs based on selected format
  const fileOutputResult = useMemo(() => {
    if (!uploadedFile) return "";
    switch (fileOutputFormat) {
      case "raw":
        return uploadedFile.rawBase64;
      case "html":
        if (uploadedFile.type.startsWith("image/")) {
          return `<img src="${uploadedFile.dataUrl}" alt="${uploadedFile.name}" />`;
        }
        return `<a href="${uploadedFile.dataUrl}" download="${uploadedFile.name}">下载 ${uploadedFile.name}</a>`;
      case "css":
        return `background-image: url("${uploadedFile.dataUrl}");`;
      case "dataurl":
      default:
        return uploadedFile.dataUrl;
    }
  }, [uploadedFile, fileOutputFormat]);

  // Download Base64 data as binary file
  const downloadBase64 = (base64Str: string, defaultName = "decoded-file") => {
    try {
      let cleanB64 = base64Str.trim();
      let mime = "application/octet-stream";
      
      // Strip Data URL prefix if present
      if (cleanB64.startsWith("data:")) {
        const match = cleanB64.match(/^data:([^;]+);base64,/);
        if (match) {
          mime = match[1];
          cleanB64 = cleanB64.slice(match[0].length);
        }
      }

      const binary = atob(cleanB64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      
      // Guess extension from mime type
      let ext = "";
      if (mime.includes("png")) ext = ".png";
      else if (mime.includes("jpeg") || mime.includes("jpg")) ext = ".jpg";
      else if (mime.includes("gif")) ext = ".gif";
      else if (mime.includes("svg")) ext = ".svg";
      else if (mime.includes("webp")) ext = ".webp";
      else if (mime.includes("pdf")) ext = ".pdf";
      else if (mime.includes("json")) ext = ".json";

      anchor.href = url;
      anchor.download = defaultName.includes(".") ? defaultName : `${defaultName}${ext}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("下载失败，请确保粘贴的数据是正确的 Base64 编码");
    }
  };

  async function copyText(text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败，请检查浏览器权限");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数据编码工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "文本的 Base64 编解码，以及支持将图片或任何文件转化为 Base64 Data URL 嵌入字串，并提供即时图片渲染与文件下载。"}</p>
      </div>

      <div className="segmented-control" style={{ marginBottom: "1.25rem" }}>
        <button type="button" className={activeTab === "text" ? "active" : ""} onClick={() => { setActiveTab("text"); setError(""); }}>
          文本 ⇆ Base64
        </button>
        <button type="button" className={activeTab === "file" ? "active" : ""} onClick={() => { setActiveTab("file"); setError(""); }}>
          文件 ⇆ Base64 (Data URL)
        </button>
      </div>

      {activeTab === "text" ? (
        /* Text Tab */
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="tool-toolbar" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
            <button type="button" className="button--primary" onClick={handleTextEncode}>
              编码为 Base64
            </button>
            <button type="button" className="button--primary" onClick={handleTextDecode}>
              解码为文本
            </button>
            <button type="button" onClick={() => copyText(outputText)} disabled={!outputText}>
              {copied ? "已复制" : "复制输出"}
            </button>
            <button type="button" className="button-link" onClick={() => { setInputText(sampleText); setOutputText(encodeBase64Text(sampleText)); setTextMode("encode"); }}>
              载入 Basic Auth 示例
            </button>
            {textMode === "decode" && detectedImage.isImage && (
              <button type="button" className="button-link" onClick={() => downloadBase64(inputText, "decoded-image")}>
                💾 下载解密文件
              </button>
            )}
          </div>

          <div className="workspace workspace--two-column">
            <label className="tool-field">
              <span>输入内容 (源数据)</span>
              <textarea 
                value={inputText} 
                onChange={(event) => { setInputText(event.target.value); setError(""); }} 
                spellCheck={false}
                placeholder={textMode === "encode" ? "输入普通文本..." : "粘贴 Base64 编码字符串..."}
                style={{ minHeight: "220px", fontFamily: "var(--font-mono), monospace", fontSize: "0.85rem" }}
              />
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%" }}>
              <label className="tool-field" style={{ flex: 1, margin: 0 }}>
                <span>输出结果 ({textMode === "encode" ? "Base64 编码" : "解码文本"})</span>
                <textarea 
                  value={outputText} 
                  readOnly 
                  spellCheck={false}
                  placeholder="结果会在此处显示"
                  style={{ minHeight: "150px", fontFamily: "var(--font-mono), monospace", fontSize: "0.85rem", background: "var(--bg-muted)" }}
                />
              </label>

              {/* Decoded image preview */}
              {detectedImage.isImage && (
                <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>📷 检测到 Base64 对应图像预览：</span>
                  <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "center", border: "1px solid var(--border-default)" }}>
                    <img 
                      src={detectedImage.previewUrl} 
                      alt="Base64 Preview" 
                      style={{ maxHeight: "100px", maxWidth: "100%", objectFit: "contain" }}
                    />
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>格式: {detectedImage.mimeType}</span>
                </div>
              )}
            </div>
          </div>

          <div className="detail-grid">
            <article className="detail-card">
              <h3>输入长度</h3>
              <p>{textStats.inputBytes} 字节</p>
            </article>
            <article className="detail-card">
              <h3>输出长度</h3>
              <p>{textStats.outputChars} 字符</p>
            </article>
            <article className="detail-card">
              <h3>运算状态</h3>
              <p style={{ fontWeight: "600" }}>{textStats.modeLabel}成功</p>
            </article>
          </div>
        </div>
      ) : (
        /* File Tab */
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="tool-toolbar" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
            <label className="tool-field tool-field--compact" style={{ flex: 1, minWidth: "220px" }}>
              <span>选择本地文件</span>
              <input type="file" onChange={handleFileUpload} style={{ height: "30px", padding: "0.2rem" }} />
            </label>
            {uploadedFile && (
              <>
                <button type="button" className="button--primary" onClick={() => copyText(fileOutputResult)}>
                  {copied ? "已复制" : "复制 Base64 结果"}
                </button>
                <button type="button" onClick={() => downloadBase64(uploadedFile.rawBase64, `base64-${uploadedFile.name}`)}>
                  💾 下载文件副本
                </button>
              </>
            )}
          </div>

          {uploadedFile ? (
            <div className="workspace workspace--two-column">
              {/* Left Column: File meta and preview */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: "1.25rem", background: "var(--bg-subtle)" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>文件元信息</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
                  <div><strong>文件名：</strong><span style={{ color: "var(--accent-primary)" }}>{uploadedFile.name}</span></div>
                  <div><strong>文件大小：</strong>{(uploadedFile.size / 1024).toFixed(2)} KB ({uploadedFile.size} 字节)</div>
                  <div><strong>MIME 类型：</strong><code>{uploadedFile.type}</code></div>
                </div>

                {uploadedFile.type.startsWith("image/") && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>文件图像预览：</span>
                    <div style={{ background: "#ffffff", padding: "1.5rem", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "center", border: "1px solid var(--border-default)" }}>
                      <img 
                        src={uploadedFile.dataUrl} 
                        alt="Uploaded Preview" 
                        style={{ maxHeight: "160px", maxWidth: "100%", objectFit: "contain" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Code Generator output formats */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className="segmented-control" style={{ margin: 0, padding: 2, height: "auto" }}>
                  <button 
                    type="button" 
                    className={fileOutputFormat === "dataurl" ? "active" : ""} 
                    style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                    onClick={() => setFileOutputFormat("dataurl")}
                  >
                    Data URL (HTML/CSS 嵌入)
                  </button>
                  <button 
                    type="button" 
                    className={fileOutputFormat === "raw" ? "active" : ""} 
                    style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                    onClick={() => setFileOutputFormat("raw")}
                  >
                    Raw Base64 纯文本
                  </button>
                  <button 
                    type="button" 
                    className={fileOutputFormat === "html" ? "active" : ""} 
                    style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                    onClick={() => setFileOutputFormat("html")}
                  >
                    HTML 代码片段
                  </button>
                  <button 
                    type="button" 
                    className={fileOutputFormat === "css" ? "active" : ""} 
                    style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                    onClick={() => setFileOutputFormat("css")}
                  >
                    CSS 样式片段
                  </button>
                </div>

                <textarea 
                  value={fileOutputResult} 
                  readOnly 
                  spellCheck={false}
                  rows={10}
                  style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.8rem", background: "var(--bg-muted)", lineHeight: 1.4 }}
                />
              </div>
            </div>
          ) : (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              minHeight: "220px",
              border: "2px dashed var(--border-default)", 
              borderRadius: "var(--radius-lg)",
              color: "var(--text-secondary)",
              fontSize: "0.875rem"
            }}>
              请选择或拖拽上传本地图片、 Favicon 图标或文件，生成器将实时渲染并输出对应的 Base64 数据片段。
            </div>
          )}
        </div>
      )}

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
      <p className="tool-note" style={{ marginTop: "1rem" }}>
        提示：大文件（如超过 3MB）进行 Base64 编码可能会导致浏览器内存占用较高，生成 Data URL 推荐在小型图片、字体或图标资产场景使用。
      </p>
    </section>
  );
}
