"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface SliceItem {
  id: number;
  row: number;
  col: number;
  dataUrl: string;
}

interface SplitterProps {
  activeFile: File | null;
  onChangeFile: (file: File | null) => void;
}

const PRESET_GRIDS = [
  { label: "九宫格 (3x3)", rows: 3, cols: 3 },
  { label: "四宫格 (2x2)", rows: 2, cols: 2 },
  { label: "三格横条 (3x1)", rows: 3, cols: 1 },
  { label: "三格竖条 (1x3)", rows: 1, cols: 3 },
  { label: "六宫格 (3x2)", rows: 3, cols: 2 }
];

export default function ImageSplitterTab({ activeFile, onChangeFile }: SplitterProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);

  // Split configurations
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [cropToSquare, setCropToSquare] = useState(true);

  // Result slices
  const [slices, setSlices] = useState<SliceItem[]>([]);
  const [downloadedSlices, setDownloadedSlices] = useState<Record<number, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Sync image source with activeFile
  useEffect(() => {
    if (!activeFile) {
      setImageSrc(null);
      setSlices([]);
      setDownloadedSlices({});
      setNaturalWidth(0);
      setNaturalHeight(0);
      return;
    }

    const url = URL.createObjectURL(activeFile);
    setImageSrc(url);
    setDownloadedSlices({});

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [activeFile]);

  // Load a file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChangeFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onChangeFile(file);
    }
  };

  // Perform slicing inside canvas
  const sliceImage = () => {
    const img = imgRef.current;
    if (!img || !imageSrc) return;

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNaturalWidth(w);
    setNaturalHeight(h);

    const generatedSlices: SliceItem[] = [];
    let count = 0;

    // Calculate source rect
    let sx = 0;
    let sy = 0;
    let sw = w;
    let sh = h;

    if (cropToSquare) {
      const size = Math.min(w, h);
      sx = (w - size) / 2;
      sy = (h - size) / 2;
      sw = size;
      sh = size;
    }

    // Individual slice dimensions
    const sliceWidth = sw / cols;
    const sliceHeight = sh / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const canvas = document.createElement("canvas");
        canvas.width = sliceWidth;
        canvas.height = sliceHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // Draw slice from image onto the temporary canvas
          ctx.drawImage(
            img,
            sx + c * sliceWidth,
            sy + r * sliceHeight,
            sliceWidth,
            sliceHeight,
            0,
            0,
            sliceWidth,
            sliceHeight
          );
          
          generatedSlices.push({
            id: count++,
            row: r,
            col: c,
            dataUrl: canvas.toDataURL("image/png")
          });
        }
      }
    }

    setSlices(generatedSlices);
  };

  // Trigger slice whenever image src, dimensions, or grid configuration changes
  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        imgRef.current = img;
        sliceImage();
      };
    } else {
      setSlices([]);
    }
  }, [imageSrc, rows, cols, cropToSquare]);

  const handleDownloadSingle = (slice: SliceItem) => {
    const link = document.createElement("a");
    const imageName = activeFile?.name || "image.png";
    const originalBase = imageName.substring(0, imageName.lastIndexOf(".")) || "image";
    link.href = slice.dataUrl;
    link.download = `${originalBase}_grid_${slice.id + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Track downloaded state
    setDownloadedSlices((prev) => ({
      ...prev,
      [slice.id]: true
    }));
  };

  // Batch download all slices sequentially with small timeouts to prevent browser blocks
  const handleDownloadAll = () => {
    slices.forEach((slice, idx) => {
      setTimeout(() => {
        handleDownloadSingle(slice);
      }, idx * 250);
    });
  };

  const handleClear = () => {
    onChangeFile(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {!activeFile ? (
        /* Upload Area */
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed var(--border)",
            borderRadius: "12px",
            background: "var(--bg-muted)",
            padding: "3.5rem 1rem",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: "none" }}
          />
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✂️</div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            上传需要分切的图片
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", maxWidth: "380px", margin: "0 auto" }}>
            支持拖拽图片到此或点击浏览。支持所有常见图片格式。切割完全在本地浏览器完成，绝不上载云端。
          </p>
        </div>
      ) : (
        /* Editor Workspace */
        <div>
          {/* Action Toolbar */}
          <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.2rem" }}>
            <div style={{ display: "flex", flex: 1, gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                当前图片: <strong>{activeFile.name}</strong> ({naturalWidth}x{naturalHeight} px)
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button 
                type="button" 
                className="button--primary" 
                onClick={handleDownloadAll}
                disabled={slices.length === 0}
              >
                📥 顺序打包下载所有切片
              </button>
              <button type="button" className="button--danger" onClick={handleClear}>
                清除图片
              </button>
            </div>
          </div>

          <div
            className="workspace"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "1.5rem",
              alignItems: "start"
            }}
          >
            {/* Split controls */}
            <div
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "1rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem"
              }}
            >
              {/* Preset Grids buttons */}
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
                  网格布局预设
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {PRESET_GRIDS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="button--secondary"
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                      onClick={() => {
                        setRows(p.rows);
                        setCols(p.cols);
                      }}
                    >
                      {p.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom rows & cols */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <div className="tool-field" style={{ gap: "0.25rem" }}>
                  <span>行数 (Row)</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rows}
                    onChange={(e) => setRows(Math.max(1, Number(e.target.value)))}
                    style={{ width: "100%", background: "var(--bg-base)" }}
                  />
                </div>
                <div className="tool-field" style={{ gap: "0.25rem" }}>
                  <span>列数 (Col)</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={cols}
                    onChange={(e) => setCols(Math.max(1, Number(e.target.value)))}
                    style={{ width: "100%", background: "var(--bg-base)" }}
                  />
                </div>
              </div>

              {/* Aspect Ratio Crop */}
              <div className="tool-field" style={{ gap: "0.25rem" }}>
                <span>切片裁剪比例</span>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-primary)", cursor: "pointer", marginTop: "0.2rem" }}>
                  <input
                    type="checkbox"
                    checked={cropToSquare}
                    onChange={(e) => setCropToSquare(e.target.checked)}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  中心裁剪为 1:1 正方形
                </label>
                <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: "0.1rem" }}>
                  💡 勾选此项，图片以中心裁剪为正方形再切图。
                </span>
              </div>
            </div>

            {/* Slices Matrix grid preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)", display: "flex", justifyContent: "space-between" }}>
                <span>💾 点击格子预览 / 单个下载</span>
                <span style={{ color: "var(--text-secondary)", fontWeight: "normal" }}>
                  共计 {slices.length} 个切片
                </span>
              </div>

              <div
                style={{
                  background: "var(--bg-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "1.5rem",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                {/* Visual Grid Slices display */}
                {slices.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${cols}, 1fr)`,
                      gap: "6px",
                      maxWidth: "480px",
                      width: "100%",
                      aspectRatio: cropToSquare ? "1" : `${naturalWidth / (naturalHeight || 1)}`,
                      background: "rgba(0,0,0,0.15)",
                      padding: "6px",
                      borderRadius: "6px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)"
                    }}
                  >
                    {slices.map((slice) => {
                      const isDownloaded = downloadedSlices[slice.id];
                      return (
                        <div
                          key={slice.id}
                          onClick={() => handleDownloadSingle(slice)}
                          style={{
                            position: "relative",
                            cursor: "pointer",
                            overflow: "hidden",
                            borderRadius: "4px",
                            aspectRatio: cropToSquare ? "1" : `${(naturalWidth / cols) / ((naturalHeight / rows) || 1)}`,
                            transition: "transform 0.2s ease, opacity 0.2s ease"
                          }}
                          className="grid-slice-item"
                        >
                          <img
                            src={slice.dataUrl}
                            alt={`slice-${slice.id + 1}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block"
                            }}
                          />
                          {/* Dark overlay & info */}
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: isDownloaded ? "rgba(16, 185, 129, 0.4)" : "rgba(0, 0, 0, 0.3)",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              alignItems: "center",
                              color: "#fff",
                              fontSize: "1.2rem",
                              fontWeight: "bold",
                              opacity: 0,
                              transition: "opacity 0.2s ease"
                            }}
                            className="grid-slice-overlay"
                          >
                            <span style={{ fontSize: "1.5rem" }}>{isDownloaded ? "✓" : "⬇"}</span>
                            <span style={{ fontSize: "0.75rem", marginTop: "0.25rem", fontWeight: "normal" }}>
                              {isDownloaded ? "已保存" : `下载第 ${slice.id + 1} 块`}
                            </span>
                          </div>

                          {/* Top corner Index label */}
                          <div
                            style={{
                              position: "absolute",
                              top: "6px",
                              left: "6px",
                              background: isDownloaded ? "var(--success, #10b981)" : "rgba(0, 0, 0, 0.6)",
                              color: "#fff",
                              fontSize: "0.7rem",
                              padding: "0.1rem 0.35rem",
                              borderRadius: "10px",
                              pointerEvents: "none",
                              fontWeight: "600"
                            }}
                          >
                            {slice.id + 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styled hover rules for grid cells */}
      <style dangerouslySetInnerHTML={{ __html: `
        .grid-slice-item:hover {
          transform: scale(0.97);
        }
        .grid-slice-item:hover .grid-slice-overlay {
          opacity: 1 !important;
        }
      ` }} />

      <div className="tool-note" style={{ marginTop: "1.5rem" }}>
        📝 <b>朋友圈发图指南：</b> 朋友圈九宫格发图顺序为：第一排（1, 2, 3）、第二排（4, 5, 6）、第三排（7, 8, 9）。使用本工具下载切片时，会自动在左上角标出序号。点击各格依次下载，即可方便地按序号上传发送。
      </div>
    </div>
  );
}
