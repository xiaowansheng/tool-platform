"use client";

import { useEffect, useRef, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type PermissionLabel = "camera" | "microphone";
type PermissionSummary = Record<PermissionLabel, PermissionState | "unsupported" | "unavailable">;

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

interface DeviceRow {
  kind: string;
  label: string;
  deviceId: string;
  groupId: string;
}

function emptyPermissions(): PermissionSummary {
  return {
    camera: "unavailable",
    microphone: "unavailable"
  };
}

async function queryPermission(name: PermissionLabel): Promise<PermissionState | "unsupported" | "unavailable"> {
  if (!navigator.permissions) {
    return "unsupported";
  }

  try {
    const status = await navigator.permissions.query({ name: name as PermissionName });
    return status.state;
  } catch {
    return "unavailable";
  }
}

function formatTrack(track: MediaStreamTrack) {
  const settings = track.getSettings();

  return {
    kind: track.kind,
    label: track.label || "(label hidden)",
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState,
    settings
  };
}

export default function MediaDevicePermissionLabTool({ manifest }: ToolClientProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [requestVideo, setRequestVideo] = useState(true);
  const [requestAudio, setRequestAudio] = useState(true);
  const [permissions, setPermissions] = useState<PermissionSummary>(() => emptyPermissions());
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [tracks, setTracks] = useState<Array<ReturnType<typeof formatTrack>>>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    void refreshPermissions();
    void refreshDevices();

    return () => {
      stopStream();
    };
  }, []);

  async function refreshPermissions() {
    const [camera, microphone] = await Promise.all([
      queryPermission("camera"),
      queryPermission("microphone")
    ]);

    setPermissions({ camera, microphone });
  }

  async function refreshDevices() {
    setError("");

    if (!navigator.mediaDevices?.enumerateDevices) {
      setError("当前浏览器不支持 navigator.mediaDevices.enumerateDevices()");
      return;
    }

    try {
      const nextDevices = await navigator.mediaDevices.enumerateDevices();

      setDevices(nextDevices.map((device) => ({
        kind: device.kind,
        label: device.label || "(授权前隐藏)",
        deviceId: device.deviceId ? `${device.deviceId.slice(0, 10)}...` : "-",
        groupId: device.groupId ? `${device.groupId.slice(0, 10)}...` : "-"
      })));
    } catch (deviceError) {
      setError(deviceError instanceof Error ? deviceError.message : "设备枚举失败");
    }
  }

  function stopMeter() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setAudioLevel(0);
  }

  function startMeter(stream: MediaStream) {
    stopMeter();

    if (stream.getAudioTracks().length === 0) {
      return;
    }

    const AudioContextConstructor = window.AudioContext ?? (window as WindowWithWebkitAudioContext).webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    const audioContext = new AudioContextConstructor();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    const data = new Uint8Array(analyser.frequencyBinCount);

    analyser.fftSize = 512;
    source.connect(analyser);
    audioContextRef.current = audioContext;

    function tick() {
      analyser.getByteTimeDomainData(data);

      let sum = 0;

      for (const value of data) {
        const centered = value - 128;
        sum += centered * centered;
      }

      const rms = Math.sqrt(sum / data.length);
      setAudioLevel(Math.min(100, Math.round((rms / 64) * 100)));
      animationFrameRef.current = requestAnimationFrame(tick);
    }

    tick();
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    stopMeter();
    setTracks([]);
    setStatus("stopped");
  }

  async function requestMedia() {
    setError("");
    setStatus("requesting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("当前浏览器不支持 getUserMedia()");
      setStatus("unsupported");
      return;
    }

    try {
      stopStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: requestVideo,
        audio: requestAudio
      });

      streamRef.current = stream;
      setTracks(stream.getTracks().map(formatTrack));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      startMeter(stream);
      setStatus("active");
      await refreshPermissions();
      await refreshDevices();
    } catch (mediaError) {
      setStatus("error");
      setError(mediaError instanceof Error ? mediaError.message : "媒体权限请求失败");
      await refreshPermissions();
    }
  }

  const settingsJson = JSON.stringify(tracks, null, 2);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">摄像头 + 麦克风</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-option-list">
        <label className="tool-check">
          <input type="checkbox" checked={requestVideo} onChange={(event) => setRequestVideo(event.target.checked)} />
          Camera
        </label>
        <label className="tool-check">
          <input type="checkbox" checked={requestAudio} onChange={(event) => setRequestAudio(event.target.checked)} />
          Microphone
        </label>
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => void requestMedia()} disabled={!requestVideo && !requestAudio}>
          请求权限
        </button>
        <button type="button" onClick={() => void refreshDevices()}>刷新设备</button>
        <button type="button" onClick={() => void refreshPermissions()}>刷新权限</button>
        <button type="button" className="button--danger" onClick={stopStream}>停止</button>
        <div className="mono-output">Status: {status}</div>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>摄像头</h3>
          <p>{permissions.camera}</p>
        </article>
        <article className="detail-card">
          <h3>麦克风</h3>
          <p>{permissions.microphone}</p>
        </article>
        <article className="detail-card">
          <h3>设备</h3>
          <p>{devices.length}</p>
        </article>
        <article className="detail-card">
          <h3>轨道</h3>
          <p>{tracks.length}</p>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <video ref={videoRef} className="media-preview" muted playsInline autoPlay />

          <div className="detail-card">
            <h3>麦克风音量</h3>
            <div className="visual-preview" style={{ minHeight: "1.6rem", padding: "0.35rem" }}>
              <div
                style={{
                  width: `${audioLevel}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: "var(--accent-primary)",
                  transition: "width 120ms ease"
                }}
              />
            </div>
            <p>{audioLevel}%</p>
          </div>

          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>设备</span>
              <span>标签</span>
            </div>
            {devices.map((device, index) => (
              <div className="tool-table__row" key={`${device.kind}-${device.deviceId}-${index}`}>
                <span>{device.kind}</span>
                <span>{device.label}</span>
              </div>
            ))}
            {devices.length === 0 ? (
              <div className="tool-table__row">
                <span>-</span>
                <span>尚未枚举到设备</span>
              </div>
            ) : null}
          </div>
        </div>

        <label className="tool-field">
          <span>轨道设置</span>
          <textarea value={settingsJson} readOnly spellCheck={false} />
        </label>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">浏览器通常只会在用户明确授权后显示真实设备 label；停止按钮会立即关闭当前页面持有的全部媒体 tracks。</p>
    </section>
  );
}
