"use client";

import { useEffect, useRef, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";
import { WorkerClient } from "@tool-platform/worker-runtime";

interface RunResult {
  stdout: string;
  result: string;
}

interface WorkerInfo {
  version: string;
  loaded: boolean;
}

const RUBY_CDN = "https://cdn.jsdelivr.net/npm/@ruby/3.4-wasm-wasi@2.7.0/dist/browser.mjs";

function createWorkerScript() {
  return `
const RUBY_URL = ${JSON.stringify(RUBY_CDN)};

let rubyVM = null;

async function ensureVM() {
  if (rubyVM) return;
  const { DefaultRubyVM } = await import(RUBY_URL);
  rubyVM = await DefaultRubyVM();
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || msg.kind !== "call") return;

  try {
    await ensureVM();

    if (msg.action === "runRuby") {
      let stdout = "";
      rubyVM.print = (s) => { stdout += s + "\\n"; };
      rubyVM.printErr = (s) => { stdout += s + "\\n"; };
      const result = rubyVM.eval(msg.payload.code);
      const output = result !== undefined ? String(result) : "";
      self.postMessage({
        id: msg.id,
        kind: "response",
        success: true,
        data: { stdout, result: output },
      });
    } else if (msg.action === "getInfo") {
      self.postMessage({
        id: msg.id,
        kind: "response",
        success: true,
        data: {
          version: rubyVM?.version ?? "",
          loaded: rubyVM != null,
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
    code: `puts "Hello, Ruby Playground!"
puts "ruby.wasm 在浏览器中运行 Ruby!"`,
  },
  {
    name: "斐波那契",
    code: `def fib(n)
  n < 2 ? n : fib(n - 1) + fib(n - 2)
end

15.times do |i|
  puts "fib(#{i}) = #{fib(i)}"
end`,
  },
  {
    name: "数组操作",
    code: `numbers = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
puts "原始: #{numbers}"
puts "排序: #{numbers.sort}"
puts "总和: #{numbers.sum}"
puts "平均: #{numbers.sum.to_f / numbers.length}"
puts "去重: #{numbers.uniq.sort}"`,
  },
  {
    name: "类与对象",
    code: `class Greeter
  def initialize(name)
    @name = name
  end

  def greet
    "你好, #{@name}!"
  end

  def self.hello
    "Hello from Ruby class method!"
  end
end

g = Greeter.new("世界")
puts g.greet
puts Greeter.hello`,
  },
  {
    name: "枚举与块",
    code: `(1..10)
  .select(&:odd?)
  .map { |n| n * n }
  .each { |n| puts n }`,
  },
  {
    name: "JSON 解析",
    code: `require "json"

data = '{"name": "Ruby", "type": "动态语言", "year": 1995}'
parsed = JSON.parse(data)
puts "名称: #{parsed["name"]}"
puts "类型: #{parsed["type"]}"
puts "诞生: #{parsed["year"]}"

puts JSON.pretty_generate(parsed)`,
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
  if (cached) return cached;

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

export default function RubyPlaygroundTool({ manifest }: ToolClientProps) {
  const [code, setCode] = useState(examples[0].code);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);
  const [rubyVersion, setRubyVersion] = useState("");
  const [copyLabel, setCopyLabel] = useState("复制");
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
      setRubyVersion("");
    }
  }

  async function getWorkerInfo() {
    if (!clientRef.current) return;
    try {
      const info = await clientRef.current.call<WorkerInfo>("getInfo", {});
      setRubyVersion(info.version);
    } catch {
      // not yet initialized
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
      const result = await clientRef.current.call<RunResult>("runRuby", { code });
      setOutput(result.stdout + (result.result ? `\n=> ${result.result}` : ""));
    } catch (error) {
      setOutput(`错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
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
          <p className="eyebrow">语言运行时 · Ruby</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        {!workerReady ? (
          <button type="button" onClick={initWorker} className="button--primary">
            启动 Ruby 运行时
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
        {rubyVersion ? (
          <div className="mono-output" style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.75rem" }}>
            <span style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent-success)",
              boxShadow: "0 0 6px var(--accent-success)",
            }} />
            Ruby {rubyVersion}
          </div>
        ) : workerReady ? (
          <span className="mono-output" style={{ fontSize: "0.84rem" }}>正在加载 Ruby WASM...</span>
        ) : null}
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>Ruby 代码</span>
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
            {loading ? "⏳ 正在执行..." : output || "点击「运行」执行 Ruby 代码"}
          </pre>
        </div>
      </div>

      <p className="tool-note">
        Ruby 运行时通过 <code>@ruby/3.4-wasm-wasi</code> (CRuby → WASM) 在 Web Worker 中执行。
        首次启动需加载 WASM 文件。支持 require 标准库（json、erb、fileutils 等）。
        注意：部分原生扩展 (C-ext) 的 gem 可能无法运行。
      </p>
    </section>
  );
}
