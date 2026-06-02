"use client";

import { useEffect, useRef, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { WorkerClient } from "@tool-platform/worker-runtime";

interface RunResult {
  stdout: string;
}

interface WorkerInfo {
  version: string;
  loaded: boolean;
}

const TS_CDN = "https://cdn.jsdelivr.net/npm/typescript@5.7.0/lib/typescript.js";

function createWorkerScript() {
  return `
const TS_URL = ${JSON.stringify(TS_CDN)};

let tsLoaded = false;
let tsVersion = "";
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function loadTS() {
  if (tsLoaded) return;
  importScripts(TS_URL);
  tsLoaded = true;
  tsVersion = self.ts.version;
}

self.onmessage = async function (event) {
  const msg = event.data;
  if (!msg || msg.kind !== "call") return;

  try {
    await loadTS();

    if (msg.action === "transpileAndRun") {
      const code = msg.payload.code;
      let stdout = "";

      const origLog = console.log;
      const origError = console.error;
      console.log = (...args) => { stdout += args.map(String).join(" ") + "\\n"; };
      console.error = (...args) => { stdout += args.map(String).join(" ") + "\\n"; };

      try {
        const result = self.ts.transpileModule(code, {
          compilerOptions: {
            module: self.ts.ModuleKind.ESNext,
            target: self.ts.ScriptTarget.ES2022,
            strict: false,
            jsx: self.ts.JsxEmit.ReactJSX,
          },
        });

        const fn = new AsyncFunction(result.outputText);
        const returnVal = await fn();

        if (returnVal !== undefined) {
          stdout += "=> " + String(returnVal) + "\\n";
        }
      } finally {
        console.log = origLog;
        console.error = origError;
      }

      self.postMessage({
        id: msg.id,
        kind: "response",
        success: true,
        data: { stdout },
      });
    } else if (msg.action === "getInfo") {
      self.postMessage({
        id: msg.id,
        kind: "response",
        success: true,
        data: {
          version: tsVersion,
          loaded: tsLoaded,
        },
      });
    } else if (msg.action === "compileOnly") {
      const result = self.ts.transpileModule(msg.payload.code, {
        compilerOptions: {
          module: self.ts.ModuleKind.ESNext,
          target: self.ts.ScriptTarget.ES2022,
          strict: false,
          jsx: self.ts.JsxEmit.ReactJSX,
        },
      });

      self.postMessage({
        id: msg.id,
        kind: "response",
        success: true,
        data: { js: result.outputText },
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
    code: `function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("TypeScript Playground"));
console.log("TypeScript 在浏览器中运行!");`,
  },
  {
    name: "斐波那契",
    code: `function fib(n: number): number {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

for (let i = 0; i < 15; i++) {
  console.log(\`fib(\${i}) = \${fib(i)}\`);
}`,
  },
  {
    name: "类型泛型",
    code: `function identity<T>(value: T): T {
  return value;
}

console.log(identity<string>("Hello"));
console.log(identity<number>(42));
console.log(identity<boolean>(true));

// 泛型函数
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

console.log(first([10, 20, 30]));
console.log(first(["a", "b", "c"]));`,
  },
  {
    name: "数组操作",
    code: `const numbers: number[] = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];

console.log("原始:", numbers);
console.log("排序:", [...numbers].sort((a, b) => a - b));
console.log("总和:", numbers.reduce((a, b) => a + b, 0));
console.log("平均:", numbers.reduce((a, b) => a + b, 0) / numbers.length);
console.log("去重:", [...new Set(numbers)].sort((a, b) => a - b));
console.log("大于5:", numbers.filter(n => n > 5));`,
  },
  {
    name: "接口与类",
    code: `interface Person {
  name: string;
  age: number;
  greet(): string;
}

class User implements Person {
  constructor(
    public name: string,
    public age: number,
  ) {}

  greet(): string {
    return \`你好, 我是 \${this.name}, 今年 \${this.age} 岁\`;
  }
}

const alice = new User("Alice", 28);
console.log(alice.greet());
console.log("年龄明年:", alice.age + 1);

// 类型别名
type Point = { x: number; y: number };
const p: Point = { x: 10, y: 20 };
console.log(\`Point: (\${p.x}, \${p.y})\`);`,
  },
  {
    name: "Promise 异步",
    code: `function delay(ms: number): Promise<string> {
  return new Promise(resolve => {
    setTimeout(() => resolve(\"延迟了 \${ms}ms\"), ms);
  });
}

async function main() {
  console.log("开始...");
  const result = await delay(500);
  console.log(result);
  console.log("异步完成!");
}

await main();
console.log("Top-level await works!");`,
  },
];

// For classic worker (importScripts), we don't use type: "module"
function createWorkerFromScript() {
  const blob = new Blob([createWorkerScript()], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url); // classic worker for importScripts support
  URL.revokeObjectURL(url);
  return worker;
}

const workerCache = new Map<string, { client: WorkerClient; worker: Worker } | null>();

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

export default function TypeScriptPlaygroundTool({ manifest }: ToolAppProps) {
  const [code, setCode] = useState(examples[0].code);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);
  const [tsVersion, setTsVersion] = useState("");
  const [copyLabel, setCopyLabel] = useState("复制");
  const [transpiledJs, setTranspiledJs] = useState("");
  const [showJs, setShowJs] = useState(false);
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
      setTsVersion("");
    }
  }

  async function getWorkerInfo() {
    if (!clientRef.current) return;
    try {
      const info = await clientRef.current.call<WorkerInfo>("getInfo", {});
      setTsVersion(info.version);
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
    setTranspiledJs("");
    setShowJs(false);

    try {
      const result = await clientRef.current.call<RunResult>("transpileAndRun", { code });
      setOutput(result.stdout);
    } catch (error) {
      setOutput(`错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  async function compileOnly() {
    if (!clientRef.current) {
      setOutput("错误: Worker 未初始化");
      return;
    }

    setLoading(true);
    try {
      const result = await clientRef.current.call<{ js: string }>("compileOnly", { code });
      setTranspiledJs(result.js);
      setShowJs(true);
    } catch (error) {
      setOutput(`编译错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    const outputToCopy = showJs && transpiledJs ? transpiledJs : output;

    try {
      await navigator.clipboard.writeText(outputToCopy);
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
          <p className="eyebrow">语言运行时 · TypeScript</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        {!workerReady ? (
          <button type="button" onClick={initWorker} className="button--primary">
            启动 TypeScript 编译器
          </button>
        ) : (
          <>
            <button type="button" onClick={() => void runCode()} disabled={loading}>
              {loading ? "运行中..." : "▶ 运行"}
            </button>
            <button type="button" onClick={() => void compileOnly()} disabled={loading}>
              编译为 JS
            </button>
            <button type="button" onClick={disposeWorker} className="button--danger">
              销毁
            </button>
          </>
        )}
        {tsVersion ? (
          <div className="mono-output" style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.75rem" }}>
            <span style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent-success)",
              boxShadow: "0 0 6px var(--accent-success)",
            }} />
            TypeScript {tsVersion}
          </div>
        ) : workerReady ? (
          <span className="mono-output" style={{ fontSize: "0.84rem" }}>正在加载 TypeScript 编译器...</span>
        ) : null}
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>TypeScript 代码</span>
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
            <span style={{ fontSize: "0.84rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              {showJs ? "编译结果 (JS)" : "输出"}
            </span>
            <button type="button" onClick={() => { setOutput(""); setTranspiledJs(""); setShowJs(false); }} disabled={!output && !transpiledJs}>
              清除
            </button>
            <button type="button" onClick={() => void copyOutput()} disabled={!(showJs && transpiledJs ? transpiledJs : output)}>
              {showJs ? "复制 JS" : copyLabel}
            </button>
            {showJs ? (
              <button type="button" onClick={() => setShowJs(false)}>
                返回输出
              </button>
            ) : null}
          </div>
          {showJs && transpiledJs ? (
            <pre
              className="mono-output"
              style={{
                minHeight: "18rem",
                maxHeight: "28rem",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "var(--bg-inset)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {transpiledJs}
            </pre>
          ) : (
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
              {loading ? "⏳ 正在执行..." : output || "点击「运行」执行 TypeScript 代码"}
            </pre>
          )}
        </div>
      </div>

      <p className="tool-note">
        TypeScript 运行时通过 TypeScript 编译器将代码编译为 JavaScript，再在 Worker 中执行。
        支持类型标注、泛型、接口、枚举、async/await、JSX 等特性。代码运行于隔离的 Worker 环境。
      </p>
    </section>
  );
}
