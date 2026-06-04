"use client";

import { useEffect, useState } from "react";

interface Frame {
  url: string;
  delay: number;
}

interface GifSplitterProps {
  activeFile: File | null;
  onChangeFile: (file: File | null) => void;
}

export default function GifSplitterTab({ activeFile, onChangeFile }: GifSplitterProps) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [gifUrl, setGifUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [totalDuration, setTotalDuration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isGif = activeFile && (activeFile.type.includes("gif") || activeFile.name.toLowerCase().endsWith(".gif"));

  useEffect(() => {
    if (!activeFile) {
      reset();
      return;
    }

    if (!isGif) {
      reset();
      return;
    }

    // Process GIF
    setFileName(activeFile.name);
    const url = URL.createObjectURL(activeFile);
    setGifUrl(url);
    setBusy(true);
    setError("");

    let video: HTMLVideoElement | null = null;
    let cancelled = false;

    async function process() {
      try {
        video = document.createElement("video");
        video.muted = true;
        video.preload = "auto";
        video.playsInline = true;

        await new Promise<void>((resolve, reject) => {
          if (!video) return;
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error("无法读取 GIF 文件（需要浏览器支持 GIF 转视频或播放）"));
          video.src = url;
        });

        if (cancelled) return;

        const duration = video.duration;
        setTotalDuration(duration);

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;

        const extractedFrames: Frame[] = [];
        // Estimate ~100ms per frame for GIFs, but limit to reasonable count
        const frameCount = Math.min(Math.max(Math.round(duration * 10), 1), 200);
        const frameDelay = duration / frameCount;

        for (let i = 0; i < frameCount; i++) {
          if (cancelled) return;
          const time = (i / frameCount) * duration;
          video.currentTime = time;
          await new Promise<void>((resolve) => {
            if (video) {
              video.onseeked = () => resolve();
            } else {
              resolve();
            }
          });

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0);

          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => b ? resolve(b) : reject(new Error("帧提取失败")), "image/png");
          });
          extractedFrames.push({ url: URL.createObjectURL(blob), delay: Math.round(frameDelay * 1000) });
        }

        if (cancelled) return;
        setFrames(extractedFrames);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "GIF 解析失败");
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    }

    process();

    return () => {
      cancelled = true;
      reset();
      if (video) {
        video.src = "";
        video.load();
      }
      URL.revokeObjectURL(url);
    };
  }, [activeFile, isGif]);

  function reset() {
    for (const f of frames) URL.revokeObjectURL(f.url);
    setFrames([]);
    setGifUrl("");
    setTotalDuration(0);
    setError("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes("gif") && !file.name.toLowerCase().endsWith(".gif")) {
        setError("请选择 GIF 格式的文件");
        return;
      }
      onChangeFile(file);
    }
  }

  function downloadAll() {
    for (let i = 0; i < frames.length; i++) {
      const a = document.createElement("a");
      a.href = frames[i]!.url;
      a.download = `${fileName.replace(/\.gif$/i, "")}-frame-${String(i + 1).padStart(3, "0")}.png`;
      a.click();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {!activeFile || !isGif ? (
        <div
          style={{
            border: "2px dashed var(--border)",
            borderRadius: "12px",
            background: "var(--bg-muted)",
            padding: "3.5rem 1rem",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/gif,.gif";
            input.onchange = (e) => handleFileChange(e as any);
            input.click();
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🖼️</div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            {activeFile && !isGif ? "当前文件非 GIF 格式，请上传 GIF 图片" : "选择或拖入 GIF 图片进行拆帧"}
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", maxWidth: "380px", margin: "0 auto" }}>
            支持提取 GIF 的每一帧，并可打包下载为 PNG 序列。所有处理完全在本地浏览器完成。
          </p>
        </div>
      ) : (
        <div>
          <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.2rem" }}>
            <div style={{ display: "flex", flex: 1, gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                当前 GIF: <strong>{fileName}</strong>
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {frames.length > 0 && (
                <button type="button" className="button--primary" onClick={downloadAll}>
                  📥 下载全部帧 ({frames.length} 帧)
                </button>
              )}
              <button
                type="button"
                className="button--danger"
                onClick={() => {
                  onChangeFile(null);
                }}
              >
                清除
              </button>
            </div>
          </div>

          {busy ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
              ⏳ 正在提取帧，请稍候 ({frames.length ? `已提取 ${frames.length} 帧` : "正在初始化"}...)
            </div>
          ) : null}

          {gifUrl ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem", alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <article className="detail-card" style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--bg-muted)" }}>
                  <p className="eyebrow" style={{ margin: "0 0 0.5rem 0" }}>GIF 播放预览</p>
                  <div style={{ background: "var(--bg-base)", display: "flex", justifyContent: "center", padding: "1rem", borderRadius: "4px" }}>
                    <img className="media-preview" src={gifUrl} alt="GIF 预览" style={{ maxWidth: "100%", maxHeight: "250px", objectFit: "contain" }} />
                  </div>
                </article>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" }}>
                  <div style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>帧数</span>
                    <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{frames.length || "-"}</div>
                  </div>
                  <div style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>总时长</span>
                    <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{totalDuration ? `${totalDuration.toFixed(2)}s` : "-"}</div>
                  </div>
                  <div style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>估算帧率</span>
                    <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{totalDuration && frames.length ? `${(frames.length / totalDuration).toFixed(1)} fps` : "-"}</div>
                  </div>
                </div>
              </div>

              {frames.length > 0 ? (
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.5rem" }}>帧序列列表</div>
                  <div className="case-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem" }}>
                    {frames.map((frame, i) => (
                      <article key={i} className="detail-card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg-muted)" }}>
                        <div className="tool-card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="eyebrow" style={{ margin: 0 }}>#{i + 1}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>{frame.delay}ms</span>
                        </div>
                        <img className="media-preview" src={frame.url} alt={`帧 ${i + 1}`} style={{ maxWidth: "100%", height: "80px", objectFit: "contain", borderRadius: "4px", background: "var(--bg-base)" }} />
                        <a
                          className="button--secondary"
                          style={{ textAlign: "center", fontSize: "0.75rem", padding: "0.15rem", display: "block", textDecoration: "none" }}
                          href={frame.url}
                          download={`${fileName.replace(/\.gif$/i, "")}-frame-${String(i + 1).padStart(3, "0")}.png`}
                        >
                          下载
                        </a>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {error ? <p className="tool-error" style={{ color: "var(--danger, #ef4444)" }}>{error}</p> : null}
      <p className="tool-note" style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
        使用 HTML Video 元素逐帧提取。对于包含透明通道或部分格式特殊的 GIF，可能会有跳帧。所有处理完全在本地浏览器完成，绝不上传。
      </p>
    </div>
  );
}
