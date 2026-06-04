"use client";

import { useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

import ImageSpecViewerTab from "./components/spec-viewer";
import ExifMetadataTab from "./components/exif-metadata";
import ImageCropperTab from "./components/cropper";
import ImageCompressorTab from "./components/compressor";
import ImageFormatConverterTab from "./components/format-converter";
import WatermarkTab from "./components/watermark";
import ImageSplitterTab from "./components/splitter";
import ImageStitcherTab from "./components/stitcher";
import GifSplitterTab from "./components/gif-splitter";

type ImageStudioTab =
  | "spec"
  | "cropper"
  | "watermark"
  | "compressor"
  | "converter"
  | "exif"
  | "splitter"
  | "stitcher"
  | "gif";

export default function ImageStudioTool({ manifest }: ToolAppProps) {
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<ImageStudioTab>("spec");

  const tabs: Array<{ id: ImageStudioTab; label: string }> = [
    { id: "spec", label: "信息与参数" },
    { id: "cropper", label: "裁剪旋转" },
    { id: "watermark", label: "添加水印" },
    { id: "compressor", label: "大小压缩" },
    { id: "converter", label: "格式转换" },
    { id: "exif", label: "清除元数据" },
    { id: "splitter", label: "网格切图" },
    { id: "stitcher", label: "长图拼接" },
    { id: "gif", label: "GIF 拆帧" }
  ];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">图片与设计</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Shared Active File Quick Bar */}
      {activeFile && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          background: "var(--bg-muted)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "10px 16px",
          marginBottom: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.2rem" }}>🖼️</span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>当前活跃图片:</span>
            <span style={{ fontWeight: "bold", fontSize: "0.85rem", wordBreak: "break-all" }}>{activeFile.name}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>({(activeFile.size / 1024).toFixed(1)} KB)</span>
          </div>
          <button 
            type="button" 
            className="button--danger" 
            style={{ padding: "4px 8px", fontSize: "0.75rem" }} 
            onClick={() => setActiveFile(null)}
          >
            清除图片
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="segmented-control" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "24px", background: "none", padding: 0 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              fontWeight: 500,
              flex: "1 0 auto",
              textAlign: "center"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="studio-tab-content" style={{ minHeight: "350px" }}>
        {activeTab === "spec" && (
          <ImageSpecViewerTab activeFile={activeFile} onChangeFile={setActiveFile} />
        )}
        {activeTab === "cropper" && (
          <ImageCropperTab activeFile={activeFile} onChangeFile={setActiveFile} />
        )}
        {activeTab === "watermark" && (
          <WatermarkTab activeFile={activeFile} onChangeFile={setActiveFile} />
        )}
        {activeTab === "compressor" && (
          <ImageCompressorTab activeFile={activeFile} onChangeFile={setActiveFile} />
        )}
        {activeTab === "converter" && (
          <ImageFormatConverterTab activeFile={activeFile} onChangeFile={setActiveFile} />
        )}
        {activeTab === "exif" && (
          <ExifMetadataTab activeFile={activeFile} onChangeFile={setActiveFile} />
        )}
        {activeTab === "splitter" && (
          <ImageSplitterTab activeFile={activeFile} onChangeFile={setActiveFile} />
        )}
        {activeTab === "stitcher" && (
          <ImageStitcherTab activeFile={activeFile} onChangeFile={setActiveFile} />
        )}
        {activeTab === "gif" && (
          <GifSplitterTab activeFile={activeFile} onChangeFile={setActiveFile} />
        )}
      </div>
    </section>
  );
}
