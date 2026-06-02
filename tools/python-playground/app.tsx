"use client";

import { useEffect, useRef, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { WorkerClient } from "@tool-platform/worker-runtime";

interface RunResult {
  stdout: string;
  result: string;
}

interface PackageResult {
  installed: string;
}

interface WorkerInfo {
  version: string;
  loaded: boolean;
}

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.mjs";

function createWorkerScript() {
  return `
const PYODIDE_URL = ${JSON.stringify(PYODIDE_CDN)};

let pyodide = null;

async function ensurePyodide() {
  if (pyodide) return;
  const { loadPyodide } = await import(PYODIDE_URL);
  pyodide = await loadPyodide({
    stdout: () => {},
    stderr: () => {},
  });
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || msg.kind !== "call") return;

  try {
    await ensurePyodide();

    if (msg.action === "runPython") {
      let stdout = "";
      pyodide.setStdout({ batched: (s) => { stdout += s; } });
      pyodide.setStderr({ batched: (s) => { stdout += s; } });
      const result = await pyodide.runPythonAsync(msg.payload.code);
      const output = result !== undefined ? String(result) : "";
      self.postMessage({
        id: msg.id,
        kind: "response",
        success: true,
        data: { stdout, result: output },
      });
    } else if (msg.action === "installPackage") {
      await pyodide.loadPackage(msg.payload.name);
      self.postMessage({
        id: msg.id,
        kind: "response",
        success: true,
        data: { installed: msg.payload.name },
      });
    } else if (msg.action === "getInfo") {
      self.postMessage({
        id: msg.id,
        kind: "response",
        success: true,
        data: {
          version: pyodide?.version ?? "",
          loaded: pyodide != null,
        },
      });
    } else {
      throw new Error("Unknown action: " + msg.action);
    }
  } catch (error) {
    self.postMessage({
      id: msg.id,
      kind: "response",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
`;
}

const examples = [
  {
    name: "Hello World",
    code: `print("Hello, Python Playground!")
print("Pyodide 在浏览器中运行 Python!")`,
  },
  {
    name: "斐波那契",
    code: `def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

for i in range(15):
    print(f"fib({i}) = {fib(i)}")`,
  },
  {
    name: "列表操作",
    code: `numbers = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
print(f"原始: {numbers}")
print(f"排序: {sorted(numbers)}")
print(f"总和: {sum(numbers)}")
print(f"平均: {sum(numbers) / len(numbers):.2f}")
print(f"去重: {sorted(set(numbers))}")`,
  },
  {
    name: "NumPy 计算",
    code: `import micropip
await micropip.install("numpy")

import numpy as np

arr = np.random.rand(3, 4)
print("随机矩阵:")
print(arr)
print()
print(f"形状: {arr.shape}")
print(f"均值: {arr.mean():.4f}")
print(f"总和: {arr.sum():.4f}")`,
  },
  {
    name: "HTTP 请求",
    code: `import micropip
await micropip.install("httpx")

import httpx

r = httpx.get("https://httpbin.org/uuid")
data = r.json()
print(f"UUID: {data['uuid']}")`,
  },
  {
    name: "Pandas 数据框",
    code: `import micropip
await micropip.install("pandas")

import pandas as pd

df = pd.DataFrame({
    "姓名": ["张三", "李四", "王五"],
    "年龄": [28, 34, 29],
    "城市": ["北京", "上海", "深圳"],
})

print("数据框:")
print(df)
print("---")
print(f"平均年龄: {df['年龄'].mean():.1f}")`,
  },
];

const workerCache = new Map<string, { client: WorkerClient; worker: Worker } | null>();

function createWorkerFromScript() {
  const blob = new Blob([createWorkerScript()], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { type: "module" });
  URL.revokeObjectURL(url);
  return worker;
}

function acquireWorkerClient(manifestId: string) {
  const cached = workerCache.get(manifestId);
  if (cached) {
    return cached;
  }

  const worker = createWorkerFromScript();
  const client = new WorkerClient(worker);
  const entry = { client, worker };
  workerCache.set(manifestId, entry);
  return entry;
}

function releaseWorker(manifestId: string) {
  const cached = workerCache.get(manifestId);
  if (cached) {
    cached.client.dispose();
    cached.worker.terminate();
  }
  workerCache.delete(manifestId);
}

export default function PythonPlaygroundTool({ manifest }: ToolAppProps) {
  const [code, setCode] = useState(examples[0].code);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);
  const [pyodideVersion, setPyodideVersion] = useState("");
  const [copyLabel, setCopyLabel] = useState("复制");
  const [installPkg, setInstallPkg] = useState("");
  const [pkgMsg, setPkgMsg] = useState("");
  const clientRef = useRef<WorkerClient | null>(null);

  useEffect(() => () => {
    if (clientRef.current) {
      releaseWorker(manifest.id);
      clientRef.current = null;
    }
  }, [manifest.id]);

  function initWorker() {
    if (clientRef.current) return;
    const { client } = acquireWorkerClient(manifest.id);
    clientRef.current = client;
    setWorkerReady(true);
    void getWorkerInfo();
  }

  function disposeWorker() {
    if (clientRef.current) {
      releaseWorker(manifest.id);
      clientRef.current = null;
      setWorkerReady(false);
      setPyodideVersion("");
    }
  }

  async function getWorkerInfo() {
    if (!clientRef.current) return;
    try {
      const info = await clientRef.current.call<WorkerInfo>("getInfo", {});
      setPyodideVersion(info.version);
    } catch {
      // Worker not yet initialized
    }
  }

  async function runCode() {
    if (!clientRef.current) {
      setOutput("错误: Worker 未初始化");
      return;
    }

    setLoading(true);
    setOutput("");

    try {
      const result = await clientRef.current.call<RunResult>("runPython", { code });
      setOutput(result.stdout + (result.result ? `\n${result.result}` : ""));
    } catch (error) {
      setOutput(`错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  async function installPackage() {
    const pkg = installPkg.trim();
    if (!pkg || !clientRef.current) return;

    setPkgMsg(`正在安装 ${pkg}...`);
    try {
      const result = await clientRef.current.call<PackageResult>("installPackage", { name: pkg });
      setPkgMsg(`已安装 ${result.installed}`);
      setInstallPkg("");
    } catch (error) {
      setPkgMsg(`安装失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
      setCopyLabel("已复制");
      setTimeout(() => setCopyLabel("复制"), 2000);
    } catch {
      setCopyLabel("复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">语言运行时 · Python</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        {!workerReady ? (
          <button type="button" onClick={initWorker} className="button--primary">
            启动 Python 运行时
          </button>
        ) : (
          <>
            <button type="button" onClick={() => void runCode()} disabled={loading}>
              {loading ? "运行中..." : "▶ 运行"}
            </button>
            <button type="button" onClick={disposeWorker} className="button--danger">
              销毁
            </button>
          </>
        )}
        {pyodideVersion ? (
          <div className="mono-output" style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.75rem" }}>
            <span style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent-success)",
              boxShadow: "0 0 6px var(--accent-success)",
            }} />
            Pyodide {pyodideVersion}
          </div>
        ) : workerReady ? (
          <span className="mono-output" style={{ fontSize: "0.84rem" }}>正在加载 Pyodide (WASM ~12MB)...</span>
        ) : null}
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>Python 代码</span>
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  if (clientRef.current) void runCode();
                }
              }}
              spellCheck={false}
              style={{ minHeight: "20rem" }}
            />
          </label>

          <div className="tool-option-list">
            <span style={{ fontSize: "0.82rem", color: "var(--text-tertiary)" }}>
              示例:
            </span>
            {examples.map((example) => (
              <button
                key={example.name}
                type="button"
                onClick={() => setCode(example.code)}
                style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem" }}
              >
                {example.name}
              </button>
            ))}
          </div>

          <label className="tool-field">
            <span>安装 Pyodide 包</span>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <input
                type="text"
                value={installPkg}
                onChange={(event) => setInstallPkg(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void installPackage();
                  }
                }}
                placeholder="包名 (如 numpy, pandas, matplotlib)"
                disabled={!workerReady}
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => void installPackage()} disabled={!workerReady || !installPkg.trim()}>
                安装
              </button>
            </div>
          </label>
          {pkgMsg ? <p className="tool-note">{pkgMsg}</p> : null}
        </div>

        <div className="workspace workspace--stack">
          <div className="tool-toolbar">
            <span style={{ fontSize: "0.84rem", color: "var(--text-secondary)", fontWeight: 600 }}>输出</span>
            <button type="button" onClick={() => setOutput("")} disabled={!output}>
              清除
            </button>
            <button type="button" onClick={() => void copyOutput()} disabled={!output}>
              {copyLabel}
            </button>
          </div>
          <pre
            className="mono-output"
            style={{
              minHeight: "18rem",
              maxHeight: "28rem",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "var(--bg-inset)",
              border: loading ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
            }}
          >
            {loading ? "⏳ 正在执行..." : output || "点击「运行」执行 Python 代码"}
          </pre>
        </div>
      </div>

      <p className="tool-note">
        Python 运行时通过 Pyodide (CPython → WASM) 在 Web Worker 中执行。
        首次启动需加载 ~12MB WASM 文件。支持通过 micropip 安装 numpy、pandas、matplotlib、httpx 等包。
      </p>
    </section>
  );
}
