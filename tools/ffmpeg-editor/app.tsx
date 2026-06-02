"use client";

import { useEffect, useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type OutputFormat = "mp4" | "webm" | "mov" | "mp3" | "wav" | "gif" | "jpg";
type Preset = "transcode" | "trim" | "resize" | "extract-audio" | "frame" | "gif";

const outputFormats: OutputFormat[] = ["mp4", "webm", "mov", "mp3", "wav", "gif", "jpg"];
const presets: Array<{ id: Preset; label: string }> = [
  { id: "transcode", label: "转码" },
  { id: "trim", label: "裁剪片段" },
  { id: "resize", label: "缩放" },
  { id: "extract-audio", label: "提取音频" },
  { id: "frame", label: "抽取封面帧" },
  { id: "gif", label: "生成 GIF" }
];

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function quote(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function extensionForPreset(preset: Preset, outputFormat: OutputFormat) {
  if (preset === "extract-audio") return outputFormat === "wav" ? "wav" : "mp3";
  if (preset === "frame") return "jpg";
  if (preset === "gif") return "gif";

  return outputFormat;
}

function baseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") || "output";
}

function buildCommand(options: {
  inputName: string;
  preset: Preset;
  outputFormat: OutputFormat;
  startTime: string;
  duration: string;
  width: number;
  fps: number;
  videoBitrate: string;
  audioBitrate: string;
  copyVideo: boolean;
}) {
  const outputExtension = extensionForPreset(options.preset, options.outputFormat);
  const outputName = `${baseName(options.inputName)}-${options.preset}.${outputExtension}`;
  const args = ["ffmpeg", "-i", quote(options.inputName)];

  if ((options.preset === "trim" || options.preset === "gif") && options.startTime.trim()) {
    args.splice(1, 0, "-ss", options.startTime.trim());
  }

  if ((options.preset === "trim" || options.preset === "gif") && options.duration.trim()) {
    args.push("-t", options.duration.trim());
  }

  if (options.preset === "extract-audio") {
    args.push("-vn", "-b:a", options.audioBitrate);
  } else if (options.preset === "frame") {
    args.push("-frames:v", "1", "-q:v", "2");
  } else if (options.preset === "gif") {
    args.push("-vf", quote(`fps=${options.fps},scale=${options.width}:-1:flags=lanczos`));
  } else {
    if (options.preset === "resize") {
      args.push("-vf", quote(`scale=${options.width}:-2`));
    }

    if (options.copyVideo) {
      args.push("-c", "copy");
    } else {
      args.push("-c:v", outputExtension === "webm" ? "libvpx-vp9" : "libx264", "-b:v", options.videoBitrate, "-b:a", options.audioBitrate);
    }
  }

  args.push(quote(outputName));

  return args.join(" ");
}

export default function FfmpegEditorTool({ manifest }: ToolAppProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [preset, setPreset] = useState<Preset>("transcode");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("mp4");
  const [startTime, setStartTime] = useState("00:00:05");
  const [clipDuration, setClipDuration] = useState("00:00:10");
  const [width, setWidth] = useState(1280);
  const [fps, setFps] = useState(12);
  const [videoBitrate, setVideoBitrate] = useState("2500k");
  const [audioBitrate, setAudioBitrate] = useState("128k");
  const [copyVideo, setCopyVideo] = useState(false);
  const [copied, setCopied] = useState(false);

  const isVideo = file?.type.startsWith("video/") ?? false;
  const isAudio = file?.type.startsWith("audio/") ?? false;
  const command = useMemo(() => buildCommand({
    inputName: file?.name ?? "input.mp4",
    preset,
    outputFormat,
    startTime,
    duration: clipDuration,
    width,
    fps,
    videoBitrate,
    audioBitrate,
    copyVideo
  }), [audioBitrate, clipDuration, copyVideo, file?.name, fps, outputFormat, preset, startTime, videoBitrate, width]);

  useEffect(() => () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  function handleFile(nextFile: File | null) {
    if (fileUrl) URL.revokeObjectURL(fileUrl);

    setFile(nextFile);
    setDuration(0);
    setDimensions({ width: 0, height: 0 });
    setFileUrl(nextFile ? URL.createObjectURL(nextFile) : "");
    setCopied(false);
  }

  async function copyCommand() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">媒体工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>媒体文件</span>
          <input type="file" accept="video/*,audio/*" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>操作</span>
          <select value={preset} onChange={(event) => setPreset(event.target.value as Preset)}>
            {presets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>输出格式</span>
          <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}>
            {outputFormats.map((format) => <option key={format} value={format}>{format}</option>)}
          </select>
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={copyVideo} onChange={(event) => setCopyVideo(event.target.checked)} />
          Stream copy
        </label>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>开始时间</span>
          <input value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>持续时间</span>
          <input value={clipDuration} onChange={(event) => setClipDuration(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>宽度 px</span>
          <input type="number" min="120" value={width} onChange={(event) => setWidth(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>GIF FPS</span>
          <input type="number" min="1" max="30" value={fps} onChange={(event) => setFps(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>视频码率</span>
          <input value={videoBitrate} onChange={(event) => setVideoBitrate(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>音频码率</span>
          <input value={audioBitrate} onChange={(event) => setAudioBitrate(event.target.value)} />
        </label>
        <button type="button" onClick={() => void copyCommand()}>{copied ? "已复制" : "复制命令"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>文件</h3>
          <p>{file?.name ?? "-"}</p>
        </article>
        <article className="detail-card">
          <h3>大小</h3>
          <p>{file ? formatBytes(file.size) : "-"}</p>
        </article>
        <article className="detail-card">
          <h3>时长</h3>
          <p>{formatDuration(duration)}</p>
        </article>
        <article className="detail-card">
          <h3>分辨率</h3>
          <p>{dimensions.width ? `${dimensions.width} x ${dimensions.height}` : "-"}</p>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <article className="detail-card">
          <p className="eyebrow">预览</p>
          {fileUrl && isVideo ? (
            <video
              className="media-preview"
              src={fileUrl}
              controls
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                setDuration(video.duration);
                setDimensions({ width: video.videoWidth, height: video.videoHeight });
              }}
            />
          ) : null}
          {fileUrl && isAudio ? (
            <audio
              className="media-audio-preview"
              src={fileUrl}
              controls
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            />
          ) : null}
          {!fileUrl ? <p>选择视频或音频文件后显示本地预览。</p> : null}
        </article>
        <label className="tool-field">
          <span>FFmpeg 命令</span>
          <textarea value={command} readOnly spellCheck={false} />
        </label>
      </div>

      <p className="tool-note">当前版本生成可复制命令并读取浏览器可解析的媒体元数据；后续可接入 ffmpeg.wasm 在 Worker 中执行。</p>
    </section>
  );
}
