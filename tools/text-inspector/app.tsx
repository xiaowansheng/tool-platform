"use client";

import { useEffect, useRef, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk, useToolRuntime, type WorkerToolRuntime } from "@tool-platform/tool-browser-sdk";

interface TextInspectionProgress {
  progress: number;
  message: string;
}

interface TextInspectionReport {
  characters: number;
  words: number;
  lines: number;
  paragraphs: number;
  uniqueWords: number;
  averageWordsPerLine: number;
  estimatedBytes: number;
  preview: string;
  generatedAt: string;
  topTokens: Array<{
    token: string;
    count: number;
  }>;
}

interface SaveReportResult {
  filename: string;
  bytes: number;
}

type WorkerStorageManager = StorageManager & {
  getDirectory?: () => Promise<FileSystemDirectoryHandle>;
};

type WorkerFileHandle = FileSystemFileHandle & {
  createSyncAccessHandle?: () => Promise<{
    truncate(size: number): void;
    write(data: BufferSource): void;
    flush(): void;
    close(): void;
  }>;
};

type WorkerDirectoryWithEntries = FileSystemDirectoryHandle & {
  entries(): AsyncIterable<[string, FileSystemHandle]>;
};

function textInspectorWorkerScope() {
  const encoder = new TextEncoder();
  const cancellations = new Set<string>();

  function normalizeWords(text: string) {
    return text
      .toLowerCase()
      .match(/[\p{L}\p{N}_-]+/gu) ?? [];
  }

  async function getWorkspaceDirectory() {
    const storage = navigator.storage as WorkerStorageManager;

    if (!storage || typeof storage.getDirectory !== "function") {
      throw new Error("OPFS is not supported in this browser");
    }

    const root = await storage.getDirectory();
    const toolPlatformDir = await root.getDirectoryHandle("tool-platform", { create: true });
    return toolPlatformDir.getDirectoryHandle("text-inspector", { create: true });
  }

  async function persistReport(filename: string, report: TextInspectionReport) {
    const directory = await getWorkspaceDirectory();
    const fileHandle = (await directory.getFileHandle(filename, { create: true })) as WorkerFileHandle;
    const payload = JSON.stringify(report, null, 2);

    if (typeof fileHandle.createSyncAccessHandle === "function") {
      const handle = await fileHandle.createSyncAccessHandle();
      const bytes = encoder.encode(payload);

      try {
        handle.truncate(0);
        handle.write(bytes);
        handle.flush();

        return {
          filename,
          bytes: bytes.byteLength
        };
      } finally {
        handle.close();
      }
    }

    const writable = await fileHandle.createWritable();
    await writable.write(payload);
    await writable.close();

    return {
      filename,
      bytes: encoder.encode(payload).byteLength
    };
  }

  async function listReports() {
    const directory = await getWorkspaceDirectory();
    const files = [];
    const iterableDirectory = directory as WorkerDirectoryWithEntries;

    for await (const [name, handle] of iterableDirectory.entries()) {
      if (handle.kind === "file") {
        files.push(name);
      }
    }

    return files.sort((left, right) => left.localeCompare(right));
  }

  async function inspectText(id: string, text: string) {
    const characters = text.length;
    const lineCount = text.length === 0 ? 0 : text.split(/\r?\n/).length;
    const chunkSize = Math.max(1, Math.ceil(Math.max(text.length, 1) / 8));

    for (let index = 0; index < text.length; index += chunkSize) {
      if (cancellations.has(id)) {
        cancellations.delete(id);
        throw new Error("Worker request cancelled");
      }

      const progress = Math.min(100, Math.round(((index + chunkSize) / Math.max(text.length, 1)) * 100));
      self.postMessage({
        id,
        kind: "stream",
        chunk: {
          progress,
          message: `Processed ${Math.min(index + chunkSize, text.length)} / ${text.length} characters`
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const words = normalizeWords(text);
    const frequency = new Map();

    for (const word of words) {
      frequency.set(word, (frequency.get(word) ?? 0) + 1);
    }

    return {
      characters,
      words: words.length,
      lines: lineCount,
      paragraphs: text.trim() ? text.trim().split(/\n\s*\n/).length : 0,
      uniqueWords: frequency.size,
      averageWordsPerLine: lineCount > 0 ? Number((words.length / lineCount).toFixed(2)) : 0,
      estimatedBytes: encoder.encode(text).byteLength,
      preview: text.slice(0, 160),
      generatedAt: new Date().toISOString(),
      topTokens: Array.from(frequency.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 8)
        .map(([token, count]) => ({ token, count }))
    };
  }

  self.onmessage = async (event) => {
    const message = event.data;

    if (message.kind === "cancel") {
      cancellations.add(message.id);
      return;
    }

    try {
      let data;

      if (message.action === "inspectText") {
        data = await inspectText(message.id, message.payload.text);
      } else if (message.action === "persistReport") {
        data = await persistReport(message.payload.filename, message.payload.report);
      } else if (message.action === "listReports") {
        data = await listReports();
      } else {
        throw new Error(`Unknown worker action: ${message.action}`);
      }

      self.postMessage({
        id: message.id,
        kind: "response",
        success: true,
        data
      });
    } catch (error) {
      self.postMessage({
        id: message.id,
        kind: "response",
        success: false,
        error: error instanceof Error ? error.message : "Worker 操作失败"
      });
    }
  };
}

export default function TextInspectorTool({ manifest }: ToolAppProps) {
  const sdkRef = useRef<ReturnType<typeof createToolSdk> | null>(null);
  const runtimeRef = useRef<WorkerToolRuntime | null>(null);
  const activeStreamRef = useRef<{ cancel(): void } | null>(null);

  if (!sdkRef.current) {
    sdkRef.current = createToolSdk();
  }

  const sdk = sdkRef.current;
  const runtime = useToolRuntime(manifest.id);
  const [input, setInput] = useState(
    "Tool Platform phase two pushes heavy text work into a dedicated worker so the UI stays responsive.\n\nThe analysis report can then be cached in OPFS for follow-up work."
  );
  const [progress, setProgress] = useState<TextInspectionProgress | null>(null);
  const [report, setReport] = useState<TextInspectionReport | null>(null);
  const [cachedFiles, setCachedFiles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sdk.registerRuntime(manifest.id, () => {
      const createdRuntime = sdk.createWorkerRuntime(() => sdk.createInlineWorker(textInspectorWorkerScope));
      runtimeRef.current = createdRuntime;
      return createdRuntime;
    });

    void sdk.openTool(manifest.id).catch((runtimeError) => {
      setError(runtimeError instanceof Error ? runtimeError.message : "Runtime failed to start");
    });

    return () => {
      activeStreamRef.current?.cancel();
      void sdk.closeTool(manifest.id);
      void sdk.unregisterRuntime(manifest.id);
      runtimeRef.current = null;
    };
  }, [manifest.id, sdk]);

  useEffect(() => {
    if (runtime.status === "active") {
      void refreshCachedFiles();
    }
  }, [runtime.status]);

  async function refreshCachedFiles() {
    if (!runtimeRef.current) {
      return;
    }

    try {
      const files = await runtimeRef.current.getClient().call<string[]>("listReports", {});
      setCachedFiles(files);
    } catch (listError) {
      setError(listError instanceof Error ? listError.message : "Failed to list cached files");
    }
  }

  async function handleAnalyze() {
    if (!runtimeRef.current) {
      setError("Worker runtime is not ready");
      return;
    }

    setBusy(true);
    setError("");
    setProgress({
      progress: 0,
      message: "Starting worker analysis"
    });

    const stream = runtimeRef.current
      .getClient()
      .stream<TextInspectionProgress, TextInspectionReport>("inspectText", { text: input }, (chunk) => {
        setProgress(chunk);
      });

    activeStreamRef.current = stream;

    try {
      const nextReport = await stream.result;

      setReport(nextReport);
      sdk.toast({
        tone: "success",
        title: "Worker analysis completed",
        description: `Processed ${nextReport.characters} characters.`
      });
    } catch (streamError) {
      setError(streamError instanceof Error ? streamError.message : "Failed to analyze text");
    } finally {
      activeStreamRef.current = null;
      setBusy(false);
    }
  }

  async function handleSaveReport() {
    if (!runtimeRef.current || !report) {
      return;
    }

    setError("");

    try {
      const result = await runtimeRef.current.getClient().call<SaveReportResult>("persistReport", {
        filename: `report-${Date.now()}.json`,
        report
      });

      sdk.toast({
        tone: "success",
        title: "Report cached in OPFS",
        description: `${result.filename} (${result.bytes} bytes)`
      });
      await refreshCachedFiles();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save report");
    }
  }

  async function handleLoadLocalFile() {
    try {
      const file = await sdk.openTextFile();
      setInput(file.text);
      sdk.toast({
        tone: "info",
        title: "Loaded local file",
        description: file.name
      });
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Failed to open local file");
    }
  }

  async function handleCopySummary() {
    if (!report) {
      return;
    }

    try {
      await sdk.copy(
        `chars=${report.characters}, words=${report.words}, lines=${report.lines}, unique=${report.uniqueWords}`
      );
      sdk.toast({
        tone: "success",
        title: "Copied summary",
        description: "The report summary is now in your clipboard."
      });
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Failed to copy the report summary");
    }
  }

  function handleDownloadReport() {
    if (!report) {
      return;
    }

    sdk.download(`text-inspector-${Date.now()}.json`, JSON.stringify(report, null, 2), "application/json");
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Worker 运行时 + OPFS</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={handleLoadLocalFile}>
          打开文件
        </button>
        <button type="button" onClick={handleAnalyze} disabled={busy || runtime.status !== "active"}>
          在 Worker 中分析
        </button>
        <button type="button" onClick={() => activeStreamRef.current?.cancel()} disabled={!activeStreamRef.current}>
          取消
        </button>
        <button type="button" onClick={handleSaveReport} disabled={!report}>
          保存到 OPFS
        </button>
        <button type="button" onClick={refreshCachedFiles} disabled={runtime.status !== "active"}>
          刷新缓存
        </button>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>输入文本</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
        </label>
        <div className="workspace workspace--stack">
          <div className="tool-results">
            <div>
              <p className="eyebrow">运行时</p>
              <strong>{runtime.status}</strong>
            </div>
            <div>
              <p className="eyebrow">OPFS</p>
              <strong>{sdk.isOpfsSupported() ? "supported" : "unsupported"}</strong>
            </div>
            <div>
              <p className="eyebrow">进度</p>
              <strong>{progress?.progress ?? 0}%</strong>
            </div>
          </div>

          <div className="detail-card">
            <h3>Worker 进度</h3>
            <p>{progress?.message ?? "等待任务开始"}</p>
          </div>

          {report ? (
            <div className="detail-card">
              <div className="tool-page__headline">
                <div>
                  <p className="eyebrow">分析报告</p>
                  <h3>文本指标</h3>
                </div>
                <div className="tool-toolbar">
                  <button type="button" onClick={handleCopySummary}>
                    复制摘要
                  </button>
                  <button type="button" onClick={handleDownloadReport}>
                    下载 JSON
                  </button>
                </div>
              </div>
              <div className="detail-grid">
                <article className="detail-card">
                  <h3>字符数</h3>
                  <p>{report.characters}</p>
                </article>
                <article className="detail-card">
                  <h3>词数</h3>
                  <p>{report.words}</p>
                </article>
                <article className="detail-card">
                  <h3>行数</h3>
                  <p>{report.lines}</p>
                </article>
                <article className="detail-card">
                  <h3>唯一项</h3>
                  <p>{report.uniqueWords}</p>
                </article>
              </div>
              <div className="tag-list">
                {report.topTokens.map((token) => (
                  <span key={token.token} className="tag">
                    {token.token} × {token.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="detail-card">
            <h3>OPFS 缓存</h3>
            <p>{cachedFiles.length > 0 ? cachedFiles.join(", ") : "当前还没有缓存文件"}</p>
          </div>
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
