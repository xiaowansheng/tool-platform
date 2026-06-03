"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Direction = "toBase64" | "fromBase64";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

export default function ImageBase64Tool({ manifest }: ToolAppProps) {
  const [direction, setDirection] = useState<Direction>("toBase64");
  const [base64Text, setBase64Text] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function reset() {
    setBase64Text("");
    setPreviewUrl("");
    setFileInfo(null);
    setError("");
    setCopied(false);
  }

  async function handleFileToBase64(file: File) {
    reset();
    try {
      const dataUrl = await fileToBase64(file);
      setBase64Text(dataUrl);
      setPreviewUrl(dataUrl);
      setFileInfo({ name: file.name, size: file.size, type: file.type });
    } catch (e) {
      setError(e instanceof Error ? e.message : "转换失败");
    }
  }

  function handleBase64ToImage() {
    setError("");
    setPreviewUrl("");
    if (!base64Text.trim()) { setError("请输入 Base64 字符串"); return; }

    let src = base64Text.trim();
    // Auto-detect if raw base64 or data URL
    if (!src.startsWith("data:")) {
      src = `data:image/png;base64,${src}`;
    }

    try {
      // Validate by creating an image
      const img = new Image();
      img.onload = () => {
        setPreviewUrl(src);
        // Calculate size from base64
        const base64Part = src.includes(",") ? src.split(",")[1]! : src;
        const byteSize = Math.round(base64Part.length * 0.75);
        setFileInfo({ name: "decoded-image", size: byteSize, type: src.split(";")[0]?.replace("data:", "") ?? "unknown" });
      };
      img.onerror = () => setError("无效的 Base64 图片数据");
      img.src = src;
    } catch {
      setError("Base64 解码失败");
    }
  }

  async function handleCopy() {
    if (!base64Text) return;
    await navigator.clipboard.writeText(base64Text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">编码工具</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>转换方向</span>
          <select value={direction} onChange={(e) => { setDirection(e.target.value as Direction); reset(); }}>
            <option value="toBase64">图片 → Base64</option>
            <option value="fromBase64">Base64 → 图片</option>
          </select>
        </label>
      </div>

      {direction === "toBase64" ? (
        <div className="tool-toolbar">
          <label className="tool-field tool-field--compact">
            <span>选择图片</span>
            <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) void handleFileToBase64(e.target.files[0]); }} />
          </label>
        </div>
      ) : (
        <label className="tool-field">
          <span>Base64 字符串（支持 Data URL 或纯 Base64）</span>
          <textarea value={base64Text} onChange={(e) => { setBase64Text(e.target.value); setPreviewUrl(""); setError(""); }} rows={6} placeholder="粘贴 Base64 或 data:image/... 字符串…" spellCheck={false} />
        </label>
      )}

      {direction === "fromBase64" ? (
        <div className="tool-toolbar">
          <button type="button" className="button--primary" onClick={handleBase64ToImage}>解码预览</button>
        </div>
      ) : null}

      {previewUrl ? (
        <div className="workspace workspace--two-column">
          <article className="detail-card">
            <p className="eyebrow">图片预览</p>
            <img className="media-preview" src={previewUrl} alt="预览" />
          </article>
          <article className="detail-card">
            <p className="eyebrow">文件信息</p>
            <p>名称：{fileInfo?.name}</p>
            <p>大小：{fileInfo ? formatBytes(fileInfo.size) : "-"}</p>
            <p>类型：{fileInfo?.type}</p>
          </article>
        </div>
      ) : null}

      {direction === "toBase64" && base64Text ? (
        <>
          <label className="tool-field">
            <span>Base64 输出</span>
            <textarea value={base64Text} readOnly rows={6} spellCheck={false} />
          </label>
          <div className="tool-toolbar">
            <button type="button" onClick={() => void handleCopy()}>{copied ? "已复制" : "复制 Base64"}</button>
            {previewUrl ? (
              <a className="button-link" href={previewUrl} download={fileInfo?.name ?? "image"}>下载原图</a>
            ) : null}
          </div>
        </>
      ) : null}

      {direction === "fromBase64" && previewUrl ? (
        <div className="tool-toolbar">
          <a className="button-link button-link--accent" href={previewUrl} download="decoded-image.png">下载解码图片</a>
        </div>
      ) : null}

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">所有转换在浏览器本地完成。从 Base64 解码时，自动检测 Data URL 前缀。</p>
    </section>
  );
}
