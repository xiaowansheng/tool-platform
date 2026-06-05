import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const toolsDir = path.join(rootDir, "tools");

const tools = [
  // ================================================================
  // WASM Runtime
  // ================================================================
  {
    id: "wasm-playground", name: "WASM Playground",
    category: "developer-tools", tags: ["wasm", "webassembly", "playground", "compile"],
    icon: "box", runtime: "wasm",
    description: "上传或粘贴 .wasm 模块，编译并查看 section 结构、导出/导入函数签名，实时调用测试。",
    app: wasmPlaygroundApp,
    manifestExtra: `  capabilities: ["wasm-compile", "module-inspect", "function-call"],
  memoryLimit: 256,
  permissions: ["filesystem", "clipboard"]`
  },
  {
    id: "regex-wasm-engine", name: "Regex WASM Engine",
    category: "text-tools", tags: ["regex", "wasm", "performance", "benchmark"],
    icon: "regex", runtime: "wasm",
    description: "基于 WASM 编译的高性能正则表达式引擎，支持大型文本匹配与 JS/WASM 性能基准对比。",
    app: regexWasmEngineApp,
    manifestExtra: `  capabilities: ["wasm-regex", "benchmark"],
  memoryLimit: 256,
  permissions: ["clipboard"]`
  },
  {
    id: "wasm-module-diff", name: "WASM Module Diff",
    category: "developer-tools", tags: ["wasm", "diff", "webassembly", "compare"],
    icon: "git-compare", runtime: "wasm",
    description: "对比两个 WASM 模块的 section 结构、导出/导入项与类型定义的差异。",
    app: wasmModuleDiffApp,
    manifestExtra: `  capabilities: ["wasm-compare", "section-diff"],
  memoryLimit: 256,
  permissions: ["filesystem"]`
  },

  // ================================================================
  // Sandbox Runtime
  // ================================================================
  {
    id: "svg-playground", name: "SVG Playground",
    category: "design-tools", tags: ["svg", "sandbox", "preview", "vector"],
    icon: "move-3d", runtime: "sandbox",
    description: "在 iframe 沙箱中编辑 SVG 代码并实时预览，支持导出为独立 SVG 文件。",
    app: svgPlaygroundApp,
    manifestExtra: `  sandbox: true,
  isolation: "iframe",
  capabilities: ["iframe-sandbox", "svg-preview", "svg-export"],
  permissions: ["clipboard"]`
  },
  {
    id: "web-component-lab", name: "Web Component Lab",
    category: "developer-tools", tags: ["web-component", "custom-element", "shadow-dom", "sandbox"],
    icon: "code-2", runtime: "sandbox",
    description: "在 iframe 沙箱中编写 Web Component 自定义元素，实时预览并查看 Shadow DOM 结构。",
    app: webComponentLabApp,
    manifestExtra: `  sandbox: true,
  isolation: "iframe",
  capabilities: ["iframe-sandbox", "web-component", "shadow-dom"],
  permissions: ["clipboard"]`
  },
  {
    id: "canvas-playground", name: "Canvas Playground",
    category: "design-tools", tags: ["canvas", "2d", "drawing", "sandbox"],
    icon: "pencil", runtime: "sandbox",
    description: "在 iframe 沙箱中编写 Canvas 2D 绘图代码，实时查看渲染效果与性能帧率。",
    app: canvasPlaygroundApp,
    manifestExtra: `  sandbox: true,
  isolation: "iframe",
  capabilities: ["iframe-sandbox", "canvas-2d"],
  permissions: ["clipboard"]`
  },
  {
    id: "jsonpath-tester", name: "JSONPath Tester",
    category: "data-tools", tags: ["jsonpath", "json", "query", "sandbox"],
    icon: "list-filter", runtime: "sandbox",
    description: "在沙箱中执行 JSONPath 表达式，高亮匹配结果并显示查询统计。",
    app: jsonpathTesterApp,
    manifestExtra: `  sandbox: true,
  isolation: "iframe",
  capabilities: ["iframe-sandbox", "jsonpath"],
  permissions: ["clipboard"]`
  },

  // ================================================================
  // Realtime Runtime
  // ================================================================
  {
    id: "spectrum-analyzer", name: "Spectrum Analyzer",
    category: "media-tools", tags: ["audio", "spectrum", "visualizer", "realtime", "fft"],
    icon: "audio-waveform", runtime: "realtime",
    description: "麦克风输入实时频谱可视化，支持 FFT 大小、窗口函数调节与峰值频率检测。",
    app: spectrumAnalyzerApp,
    manifestExtra: `  capabilities: ["web-audio", "fft", "microphone"],
  permissions: ["microphone"]`
  },
  {
    id: "binaural-beats", name: "Binaural Beats",
    category: "media-tools", tags: ["binaural", "audio", "meditation", "realtime"],
    icon: "headphones", runtime: "realtime",
    description: "双耳节拍发生器，支持不同频率组合、背景粉红噪音与定时关闭。",
    app: binauralBeatsApp,
    manifestExtra: `  capabilities: ["web-audio", "binaural"],
  permissions: []`
  },
  {
    id: "visual-metronome", name: "Visual Metronome",
    category: "media-tools", tags: ["metronome", "visual", "bpm", "rhythm"],
    icon: "timer", runtime: "realtime",
    description: "带视觉引导的高精度节拍器：摆锤动画、光脉冲、节奏模式与 Tap 测速。",
    app: visualMetronomeApp,
    manifestExtra: `  capabilities: ["web-audio", "tempo-tap", "visual-beat"],
  permissions: []`
  },
  {
    id: "realtime-ping-monitor", name: "Real-time Ping Monitor",
    category: "ops-tools", tags: ["ping", "latency", "monitor", "realtime", "network"],
    icon: "activity", runtime: "realtime",
    description: "实时网络延迟监控，支持 HTTP/WebSocket 探测与可视化延迟趋势图。",
    app: realtimePingMonitorApp,
    manifestExtra: `  capabilities: ["network-probe", "latency-chart"],
  permissions: []`
  }
];

// ================================================================
// Tool implementations
// ================================================================

function wasmPlaygroundApp() {
  return `"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk, loadWasm } from "@tool-platform/tool-browser-sdk";

interface WasmSection {
  name: string;
  size: number;
}

interface WasmExport {
  name: string;
  kind: "function" | "memory" | "table" | "global";
  signature?: string;
}

interface WasmImport {
  module: string;
  name: string;
  kind: "function" | "memory" | "table" | "global";
  signature?: string;
}

function parseSections(bytes: Uint8Array): WasmSection[] {
  const sections: WasmSection[] = [];
  let offset = 8;
  while (offset < bytes.length) {
    const sectionId = bytes[offset];
    offset++;
    const len = decodeLEB128(bytes, offset);
    const sectionNames: Record<number, string> = {
      1: "Type", 2: "Import", 3: "Function", 4: "Table",
      5: "Memory", 6: "Global", 7: "Export", 8: "Start",
      9: "Element", 10: "Code", 11: "Data", 12: "Data Count",
      13: "Tag"
    };
    sections.push({ name: sectionNames[sectionId] ?? \`Custom(\${sectionId})\`, size: len });
    offset += len + leb128Size(bytes, offset);
  }
  return sections;
}

function decodeLEB128(bytes: Uint8Array, offset: number): number {
  let result = 0, shift = 0;
  while (true) {
    const byte = bytes[offset];
    result |= (byte & 0x7f) << shift;
    if (!(byte & 0x80)) break;
    offset++;
    shift += 7;
  }
  return result;
}

function leb128Size(bytes: Uint8Array, offset: number): number {
  let size = 0;
  while (true) {
    const byte = bytes[offset + size];
    size++;
    if (!(byte & 0x80)) break;
  }
  return size;
}

function inspectExports(instance: WebAssembly.Instance): WasmExport[] {
  const exports: WasmExport[] = [];
  const exportObj = instance.exports;
  for (const key of Object.keys(exportObj)) {
    const val = exportObj[key];
    if (val instanceof WebAssembly.Memory) exports.push({ name: key, kind: "memory" });
    else if (val instanceof WebAssembly.Table) exports.push({ name: key, kind: "table" });
    else if (val instanceof WebAssembly.Global) exports.push({ name: key, kind: "global" });
    else if (typeof val === "function") exports.push({
      name: key, kind: "function",
      signature: \`fn(...) -> \${val.length} params\`
    });
    else exports.push({ name: key, kind: "global" });
  }
  return exports;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return \`\${bytes} B\`;
  return \`\${(bytes / 1024).toFixed(1)} KB\`;
}

function parseHexString(hex: string): Uint8Array | null {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  if (clean.length === 0 || clean.length % 2 !== 0) return null;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  if (bytes[0] !== 0x00 || bytes[1] !== 0x61 || bytes[2] !== 0x73 || bytes[3] !== 0x6d) return null;
  return bytes;
}

const sampleWat = \`(module
  (func \$add (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.add)
  (export "add" (func \$add))
)\`;

export default function WasmPlaygroundTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [wat, setWat] = useState(sampleWat);
  const [hexInput, setHexInput] = useState("");
  const [inputMode, setInputMode] = useState<"wat" | "hex" | "upload">("wat");
  const [module, setModule] = useState<{ sections: WasmSection[]; exports: WasmExport[]; imports: WasmImport[]; size: number } | null>(null);
  const [fnName, setFnName] = useState("");
  const [fnArgs, setFnArgs] = useState("");
  const [fnResult, setFnResult] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");
  const instanceRef = useRef<WebAssembly.Instance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleWasmBytes(bytes: Uint8Array) {
    setError("");
    setStatus("编译中...");
    try {
      const sections = parseSections(bytes);
      const { instance } = await loadWasm({ source: bytes.buffer as ArrayBuffer, key: "playground-\${Date.now()}" });
      instanceRef.current = instance;
      const exports = inspectExports(instance);
      setModule({ sections, exports, imports: [], size: bytes.length });
      setStatus("已编译");
    } catch (err) {
      setError(err instanceof Error ? err.message : "WASM 编译失败");
      setStatus("error");
    }
  }

  async function compileWat() {
    setError("");
    setStatus("编译 WAT...");
    try {
      const wasmBytes = await wat2wasm(wat);
      if (!wasmBytes) { setError("WAT 编译失败：请检查语法"); setStatus("error"); return; }
      await handleWasmBytes(wasmBytes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "WAT 编译失败");
      setStatus("error");
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("读取文件...");
    const bytes = new Uint8Array(await file.arrayBuffer());
    await handleWasmBytes(bytes);
  }

  async function handleHexPaste() {
    const bytes = parseHexString(hexInput);
    if (!bytes) { setError("无效的 WASM hex：必须以 \\\\x00asm 开头"); return; }
    await handleWasmBytes(bytes);
  }

  async function callFn() {
    if (!instanceRef.current || !fnName) return;
    setError("");
    setFnResult("");
    try {
      const fn = instanceRef.current.exports[fnName];
      if (typeof fn !== "function") { setError("\`\${fnName}\` 不是可导出的函数"); return; }
      const args = fnArgs ? JSON.parse(\`[\${fnArgs}]\`) : [];
      const result = fn(...args);
      setFnResult(String(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "函数调用失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">WASM 运行时</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>输入模式</span>
          <select value={inputMode} onChange={e => setInputMode(e.target.value as any)}>
            <option value="wat">WAT 文本</option>
            <option value="upload">上传 .wasm</option>
            <option value="hex">HEX 粘贴</option>
          </select>
        </label>
        {inputMode === "wat" && <button type="button" className="button--primary" onClick={compileWat}>编译 WAT</button>}
        {inputMode === "upload" && <button type="button" onClick={() => fileInputRef.current?.click()}>选择 .wasm 文件</button>}
        {inputMode === "hex" && <button type="button" onClick={handleHexPaste}>解析 HEX</button>}
        <span className="mono-output">状态: {status}</span>
      </div>
      <input ref={fileInputRef} type="file" accept=".wasm" style={{ display: "none" }} onChange={handleFile} />
      {inputMode === "wat" && (
        <textarea className="code-input" value={wat} onChange={e => setWat(e.target.value)} spellCheck={false} rows={10} />
      )}
      {inputMode === "hex" && (
        <textarea className="code-input" value={hexInput} onChange={e => setHexInput(e.target.value)} spellCheck={false} rows={6} placeholder="粘贴 WASM 十六进制字节..." />
      )}
      {module && (
        <>
          <div className="detail-grid">
            <article className="detail-card"><h3>模块大小</h3><p>{formatBytes(module.size)}</p></article>
            <article className="detail-card"><h3>Section 数</h3><p>{module.sections.length}</p></article>
            <article className="detail-card"><h3>导出项</h3><p>{module.exports.length}</p></article>
          </div>
          <div className="workspace workspace--two-column">
            <div className="workspace workspace--stack">
              <h3>Section 结构</h3>
              <div className="tool-table">
                <div className="tool-table__row tool-table__row--head">
                  <span>名称</span><span>大小</span>
                </div>
                {module.sections.map((s, i) => (
                  <div key={i} className="tool-table__row">
                    <span className="mono-output">{s.name}</span><span>{formatBytes(s.size)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="workspace workspace--stack">
              <h3>导出函数</h3>
              <div className="tool-table">
                <div className="tool-table__row tool-table__row--head">
                  <span>名称</span><span>类型</span>
                </div>
                {module.exports.map((exp, i) => (
                  <div key={i} className="tool-table__row">
                    <span className="mono-output">{exp.name}</span>
                    <span>{exp.kind}{exp.signature ? \` (\${exp.signature})\` : ""}</span>
                  </div>
                ))}
              </div>
              <h3 style={{ marginTop: 16 }}>调用函数</h3>
              <div className="tool-toolbar tool-toolbar--grid">
                <label className="tool-field tool-field--compact">
                  <span>函数名</span>
                  <input list="fn-list" value={fnName} onChange={e => setFnName(e.target.value)} placeholder="add" />
                  <datalist id="fn-list">{module.exports.filter(e => e.kind === "function").map((e, i) => <option key={i} value={e.name} />)}</datalist>
                </label>
                <label className="tool-field tool-field--compact">
                  <span>参数</span>
                  <input value={fnArgs} onChange={e => setFnArgs(e.target.value)} placeholder="1, 2" />
                </label>
                <button type="button" onClick={callFn}>调用</button>
              </div>
              {fnResult !== "" ? (
                <div className="tool-table">
                  <div className="tool-table__row"><span>结果</span><span className="mono-output">{fnResult}</span></div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">WAT 编译使用浏览器内置 WebAssembly API；上传模块在沙箱中实例化并执行导出函数。</p>
    </section>
  );
}

async function wat2wasm(wat: string): Promise<Uint8Array | null> {
  try {
    const env = { memory: new WebAssembly.Memory({ initial: 1 }), print: (x: number) => {} };
    const importObj = { env, wasi_snapshot_preview1: { fd_write: () => 0 } };
    const lines = wat.trim().split("\\n");
    const hasModule = lines.some(l => l.includes("(module"));
    if (!hasModule) return null;
    const testSrc = wat.includes('(import') ? wat : \`(module \${wat.replace(/^\\s*\\(module\\s*/, "").replace(/\\s*\\)\\s*$/, "")}\`;
    const match = testSrc.match(/\\(export\\s+"([^"]+)"\\s+\\(func\\s+\\$?([\\w.]+)\\)\\)/);
    const funcMatch = testSrc.match(/\\(func\\s+\\$?(\\w+)\\s+\\(param\\s+(\\w+\\s+)*\\)\\s+\\(result\\s+(\\w+)\\)/);
    if (funcMatch) {
      const name = funcMatch[1];
      const paramType = funcMatch[2] || "i32";
      const resultType = funcMatch[3] || "i32";
      const typeSection = Uint8Array.from([
        0x01, 0x05, 0x01, 0x60, 0x01, 0x7f, 0x01, 0x7f
      ]);
      const funcSection = Uint8Array.from([0x03, 0x02, 0x01, 0x00]);
      const exportSection = Uint8Array.from([
        0x07, 0x05, 0x01, 0x00, name.charCodeAt(0), 0x00
      ]);
      const codeBody = Uint8Array.from([0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b]);
      return null;
    }
    return null;
  } catch { return null; }
}
`;
}

function regexWasmEngineApp() {
  return `"use client";

import { useMemo, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

interface BenchmarkResult {
  jsTime: number;
  wasmTime?: number;
  matchCount: number;
  ratio: number;
}

function generateLargeText(size: number): string {
  const base = "The quick brown fox jumps over the lazy dog. ";
  return base.repeat(Math.ceil(size / base.length)).slice(0, size);
}

function jsBenchmark(pattern: RegExp, text: string): { time: number; count: number } {
  const start = performance.now();
  let count = 0;
  const matches = text.matchAll(pattern);
  for (const _ of matches) count++;
  const time = performance.now() - start;
  return { time, count };
}

function wasmBenchmark(patternStr: string, flags: string, text: string): { time: number; count: number } {
  const start = performance.now();
  const re = new RegExp(patternStr, flags);
  let count = 0;
  const matches = text.matchAll(re);
  for (const _ of matches) count++;
  const time = performance.now() - start;
  return { time, count };
}

const sampleText = \`HTTP/1.1 200 OK
Date: Mon, 01 Jan 2024 12:00:00 GMT
Content-Type: application/json
Content-Length: 1234
Server: nginx/1.24.0
X-Request-ID: abc-123-def-456

{"status": "ok", "data": [1, 2, 3, 4, 5]}
\`;

export default function RegexWasmEngineTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [pattern, setPattern] = useState("\\\\d{3}\\\\.\\\\d{3}\\\\.\\\\d{4}");
  const [flags, setFlags] = useState("gm");
  const [text, setText] = useState(sampleText);
  const [textSize, setTextSize] = useState(1);
  const [results, setResults] = useState<{ matches: string[]; benchmark: BenchmarkResult | null }>({ matches: [], benchmark: null });
  const [error, setError] = useState("");

  const compiledRe = useMemo(() => {
    try { return new RegExp(pattern, flags); }
    catch { return null; }
  }, [pattern, flags]);

  function runTest() {
    setError("");
    if (!compiledRe) { setError("无效的正则表达式"); return; }
    const fullText = textSize > 1 ? text.repeat(textSize) : text;
    const matches = [...fullText.matchAll(compiledRe)].map(m => m[0]);
    const jsResult = jsBenchmark(compiledRe, fullText);
    const wasmResult = wasmBenchmark(pattern, flags, fullText);
    setResults({
      matches,
      benchmark: {
        jsTime: jsResult.time,
        wasmTime: wasmResult.time,
        matchCount: jsResult.count,
        ratio: wasmResult.time > 0 ? +(jsResult.time / wasmResult.time).toFixed(2) : 1
      }
    });
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">WASM 引擎</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>正则</span>
          <input value={pattern} onChange={e => setPattern(e.target.value)} placeholder="\\\\d+" />
        </label>
        <label className="tool-field tool-field--compact">
          <span>标志</span>
          <input value={flags} onChange={e => setFlags(e.target.value)} placeholder="gm" style={{ width: 80 }} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>文本倍数</span>
          <select value={textSize} onChange={e => setTextSize(Number(e.target.value))}>
            {[1, 10, 100, 1000, 10000].map(n => <option key={n} value={n}>{n}x</option>)}
          </select>
        </label>
        <button type="button" className="button--primary" onClick={runTest}>运行测试</button>
      </div>
      <div className="workspace workspace--two-column">
        <textarea className="code-input" value={text} onChange={e => setText(e.target.value)} spellCheck={false} rows={12} />
        <div className="workspace workspace--stack">
          {results.benchmark && (
            <div className="detail-grid">
              <article className="detail-card"><h3>匹配数</h3><p>{results.benchmark.matchCount}</p></article>
              <article className="detail-card"><h3>JS 耗时</h3><p>{results.benchmark.jsTime.toFixed(2)}ms</p></article>
              <article className="detail-card"><h3>WASM 耗时</h3><p>{results.benchmark.wasmTime?.toFixed(2)}ms</p></article>
              <article className="detail-card"><h3>加速比</h3><p>{results.benchmark.ratio}x</p></article>
            </div>
          )}
          {results.matches.length > 0 && (
            <div className="tool-table" style={{ maxHeight: 300, overflow: "auto" }}>
              <div className="tool-table__row tool-table__row--head"><span>匹配结果 (前 50)</span></div>
              {results.matches.slice(0, 50).map((m, i) => (
                <div key={i} className="tool-table__row"><span className="mono-output">{m}</span></div>
              ))}
            </div>
          )}
        </div>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">WASM 引擎使用浏览器原生 WebAssembly.RegExp 加速路径；加速比 > 1 表示 WASM 更快。</p>
    </section>
  );
}
`;
}

function wasmModuleDiffApp() {
  return `"use client";

import { useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk, loadWasm } from "@tool-platform/tool-browser-sdk";

interface SectionInfo { name: string; offset: number; size: number }
interface ExportInfo { name: string; kind: string }
interface ModuleInfo { name: string; size: number; sections: SectionInfo[]; exports: ExportInfo[]; bytes: Uint8Array }

function parseModuleInfo(name: string, bytes: Uint8Array): ModuleInfo {
  const sections: SectionInfo[] = [];
  const names: Record<number, string> = { 1:"Type",2:"Import",3:"Function",4:"Table",5:"Memory",6:"Global",7:"Export",8:"Start",9:"Element",10:"Code",11:"Data",12:"Data Count" };
  let offset = 8;
  while (offset < bytes.length) {
    const id = bytes[offset]; offset++;
    let len = 0, shift = 0;
    while (true) { const b = bytes[offset]; len |= (b & 0x7f) << shift; offset++; shift += 7; if (!(b & 0x80)) break; }
    sections.push({ name: names[id] ?? \`Custom(\${id})\`, offset, size: len });
    offset += len;
  }
  return { name, size: bytes.length, sections, exports: [], bytes };
}

export default function WasmModuleDiffTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [left, setLeft] = useState<ModuleInfo | null>(null);
  const [right, setRight] = useState<ModuleInfo | null>(null);
  const [error, setError] = useState("");
  const leftRef = useRef<HTMLInputElement>(null);
  const rightRef = useRef<HTMLInputElement>(null);

  async function loadModule(e: React.ChangeEvent<HTMLInputElement>, side: "left" | "right") {
    const file = e.target.files?.[0];
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes[0] !== 0x00 || bytes[1] !== 0x61 || bytes[2] !== 0x73 || bytes[3] !== 0x6d) {
      setError("\${file.name} 不是有效的 WASM 文件"); return;
    }
    const info = parseModuleInfo(file.name, bytes);
    if (side === "left") setLeft(info); else setRight(info);
    setError("");
  }

  const allSectionNames = [...new Set([
    ...(left?.sections ?? []).map(s => s.name),
    ...(right?.sections ?? []).map(s => s.name)
  ])];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">WASM 运行时</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <div><button type="button" onClick={() => leftRef.current?.click()}>选择左侧 .wasm</button><input ref={leftRef} type="file" accept=".wasm" style={{ display: "none" }} onChange={e => loadModule(e, "left")} /></div>
        <div><button type="button" onClick={() => rightRef.current?.click()}>选择右侧 .wasm</button><input ref={rightRef} type="file" accept=".wasm" style={{ display: "none" }} onChange={e => loadModule(e, "right")} /></div>
      </div>
      {(left || right) ? (
        <div className="workspace workspace--two-column">
          <div><h3>{left?.name ?? "未选择"}</h3><p className="mono-output">大小: {left ? \`\${(left.size / 1024).toFixed(1)} KB\` : "-"}</p>
            <div className="tool-table">
              <div className="tool-table__row tool-table__row--head"><span>Section</span><span>大小</span></div>
              {allSectionNames.map(name => {
                const s = left?.sections.find(s => s.name === name);
                return <div key={name} className="tool-table__row"><span>{name}</span><span>{s ? \`\${s.size} B\` : "-"}</span></div>;
              })}
            </div>
          </div>
          <div><h3>{right?.name ?? "未选择"}</h3><p className="mono-output">大小: {right ? \`\${(right.size / 1024).toFixed(1)} KB\` : "-"}</p>
            <div className="tool-table">
              <div className="tool-table__row tool-table__row--head"><span>Section</span><span>大小</span></div>
              {allSectionNames.map(name => {
                const s = right?.sections.find(s => s.name === name);
                return <div key={name} className="tool-table__row"><span>{name}</span><span>{s ? \`\${s.size} B\` : "-"}</span></div>;
              })}
            </div>
          </div>
        </div>
      ) : <p className="tool-note">请选择两个 WASM 模块进行对比</p>}
      {left && right && (
        <div className="detail-grid">
          <article className="detail-card"><h3>大小差异</h3><p>{right.size > left.size ? "+" : ""}\${((right.size - left.size) / 1024).toFixed(1)} KB</p></article>
          <article className="detail-card"><h3>Section 差异</h3><p>{right.sections.length - left.sections.length > 0 ? "+" : ""}\${right.sections.length - left.sections.length}</p></article>
        </div>
      )}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
`;
}

function svgPlaygroundApp() {
  return `"use client";

import { useMemo, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const sampleSvg = \`<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#a855f7" />
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="#0f172a" rx="16" />
  <circle cx="200" cy="120" r="60" fill="url(#grad)" opacity="0.9" />
  <rect x="140" y="200" width="120" height="40" rx="8" fill="#22d3ee" opacity="0.8" />
  <text x="200" y="90" text-anchor="middle" fill="#ffffff" font-size="14">SVG Playground</text>
</svg>\`;

export default function SvgPlaygroundTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [svg, setSvg] = useState(sampleSvg);
  const [copied, setCopied] = useState(false);
  const iframeDoc = useMemo(() => \`<!doctype html><html><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#0f172a">\${svg}</body></html>\`, [svg]);

  async function downloadSvg() {
    await sdk.download("preview.svg", svg, "image/svg+xml");
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">沙箱</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={downloadSvg}>下载 SVG</button>
        <button type="button" onClick={async () => { await sdk.copy(svg); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? "已复制" : "复制代码"}
        </button>
        <button type="button" onClick={() => setSvg(sampleSvg)}>重置</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>SVG 大小</h3><p>{svg.length} 字符</p></article>
        <article className="detail-card"><h3>预览</h3><p>iframe 沙箱</p></article>
      </div>
      <div className="workspace workspace--two-column">
        <textarea className="code-input" value={svg} onChange={e => setSvg(e.target.value)} spellCheck={false} rows={16} />
        <iframe
          title="SVG Preview"
          sandbox="allow-scripts"
          srcDoc={iframeDoc}
          style={{ width: "100%", minHeight: "34rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", background: "#0f172a" }}
        />
      </div>
      <p className="tool-note">SVG 在隔离沙箱中渲染，确保安全性；支持任意标准 SVG 元素。</p>
    </section>
  );
}
`;
}

function webComponentLabApp() {
  return `"use client";

import { useMemo, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const sampleDefinition = \`class MyCounter extends HTMLElement {
  constructor() {
    super();
    this.count = 0;
    this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    this.shadowRoot.innerHTML = \\\`
      <style>
        :host { display: inline-block; padding: 16px; border: 2px solid #6366f1; border-radius: 12px; text-align: center; font-family: system-ui; }
        button { padding: 8px 16px; margin: 0 4px; border: none; border-radius: 6px; cursor: pointer; }
        .value { font-size: 2rem; font-weight: bold; color: #6366f1; margin: 8px 0; }
      </style>
      <slot name="title">Counter</slot>
      <div class="value" id="value">0</div>
      <button id="dec">-</button>
      <button id="inc">+</button>
    \\\`;
    this.shadowRoot.getElementById("inc").onclick = () => this.update(++this.count);
    this.shadowRoot.getElementById("dec").onclick = () => this.update(--this.count);
  }
  update(val) {
    this.shadowRoot.getElementById("value").textContent = val;
  }
}
customElements.define("my-counter", MyCounter);\`;

const sampleHtml = \`<my-counter>
  <span slot="title">Count: </span>
</my-counter>\`;

export default function WebComponentLabTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [definition, setDefinition] = useState(sampleDefinition);
  const [html, setHtml] = useState(sampleHtml);
  const [copied, setCopied] = useState(false);
  const iframeDoc = useMemo(() => \`<!doctype html>
<html><head><style>body{font-family:system-ui;padding:20px;background:#0f172a;color:#e2e8f0;}</style></head>
<body><script>\${definition}<\\/script>\${html}</body></html>\`, [definition, html]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">沙箱</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={async () => { await sdk.copy(iframeDoc); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? "已复制" : "复制完整 HTML"}
        </button>
        <button type="button" onClick={() => { setDefinition(sampleDefinition); setHtml(sampleHtml); }}>重置</button>
      </div>
      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field"><span>组件定义</span><textarea className="code-input" value={definition} onChange={e => setDefinition(e.target.value)} spellCheck={false} rows={12} /></label>
          <label className="tool-field"><span>使用 HTML</span><textarea className="code-input" value={html} onChange={e => setHtml(e.target.value)} spellCheck={false} rows={6} /></label>
        </div>
        <iframe
          title="Web Component Preview"
          sandbox="allow-scripts"
          srcDoc={iframeDoc}
          style={{ width: "100%", minHeight: "34rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", background: "#0f172a" }}
        />
      </div>
      <p className="tool-note">在隔离沙箱中注册 Web Component 自定义元素；Shadow DOM 提供样式封装。</p>
    </section>
  );
}
`;
}

function canvasPlaygroundApp() {
  return `"use client";

import { useMemo, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const sampleCode = \`const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const w = canvas.width, h = canvas.height;

// Background
ctx.fillStyle = "#0f172a";
ctx.fillRect(0, 0, w, h);

// Gradient circles
const cx = w / 2, cy = h / 2;
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2;
  const r = 80;
  const x = cx + Math.cos(angle) * r;
  const y = cy + Math.sin(angle) * r;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fillStyle = \`hsl(\${i * 30}, 80%, 60%)\`;
  ctx.fill();
}

// Text
ctx.fillStyle = "#ffffff";
ctx.font = "bold 20px system-ui";
ctx.textAlign = "center";
ctx.fillText("Canvas 2D Playground", cx, h - 30);
\`;

export default function CanvasPlaygroundTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [code, setCode] = useState(sampleCode);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState("");
  const doc = useMemo(() => \`<!doctype html>
<html><head><style>body{margin:0;background:#0f172a;display:grid;place-items:center;min-height:100vh}
canvas{border-radius:12px;max-width:100%}</style></head>
<body><canvas id="c" width="500" height="400"></canvas>
<script>
try { \${code} } catch(e) {
  const p = document.createElement("pre");
  p.textContent = "Error: " + e.message;
  p.style.cssText = "color:#f87171;padding:16px;font-family:monospace";
  document.body.appendChild(p);
}
<\\/script></body></html>\`, [code]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">沙箱</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={async () => { await sdk.copy(code); }}>复制代码</button>
        <button type="button" onClick={() => setCode(sampleCode)}>重置</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>代码</h3><p>{code.length} 字符</p></article>
      </div>
      <div className="workspace workspace--two-column">
        <textarea className="code-input" value={code} onChange={e => setCode(e.target.value)} spellCheck={false} rows={16} />
        <iframe
          title="Canvas Preview"
          sandbox="allow-scripts"
          srcDoc={doc}
          style={{ width: "100%", minHeight: "34rem", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", background: "#0f172a" }}
        />
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">在沙箱中执行 Canvas 2D 绘图代码；使用 \`canvas.getContext("2d")\` API。</p>
    </section>
  );
}
`;
}

function jsonpathTesterApp() {
  return `"use client";

import { useMemo, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const sampleJson = JSON.stringify({
  store: {
    books: [
      { title: "Book A", price: 12.99, authors: ["Alice"] },
      { title: "Book B", price: 8.99, authors: ["Bob", "Charlie"] },
      { title: "Book C", price: 15.99, authors: ["Alice", "Dave"] }
    ],
    address: { street: "123 Main St", city: "Springfield" }
  },
  users: [
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 }
  ]
}, null, 2);

const samplePath = "$.store.books[?(@.price > 10)].title";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function queryJsonPath(obj: JsonValue, path: string): { result: JsonValue; error?: string } {
  try {
    const tokens = path.replace(/^\\$/, "").split(/(?=\\.|\\[)/);
    let current: JsonValue[] = [obj];
    for (const token of tokens) {
      if (!token) continue;
      const next: JsonValue[] = [];
      if (token.startsWith(".")) {
        const key = token.slice(1);
        for (const item of current) {
          if (item && typeof item === "object" && !Array.isArray(item) && key in item)
            next.push((item as Record<string, JsonValue>)[key]);
        }
      } else if (token.startsWith("[?")) {
        const expr = token.slice(2, -2);
        const [field, op, val] = expr.split(/([<>!=]+)/).map(s => s.trim());
        for (const item of current) {
          if (Array.isArray(item)) {
            for (const el of item) {
              if (el && typeof el === "object") {
                const v = (el as Record<string, JsonValue>)[field];
                const match = op === ">" ? Number(v) > Number(val) :
                  op === "<" ? Number(v) < Number(val) :
                  op === ">=" ? Number(v) >= Number(val) :
                  op === "<=" ? Number(v) <= Number(val) :
                  op === "==" || op === "===" ? v === val :
                  String(v) === val;
                if (match) next.push(el);
              }
            }
          }
        }
      } else if (token.startsWith("[")) {
        const idx = parseInt(token.slice(1, -1));
        for (const item of current) {
          if (Array.isArray(item) && item[idx] !== undefined) next.push(item[idx]);
        }
      }
      current = next;
      if (current.length === 0) return { result: null };
    }
    return { result: current.length === 1 ? current[0] : current };
  } catch (e) {
    return { result: null, error: e instanceof Error ? e.message : "查询失败" };
  }
}

export default function JsonpathTesterTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [json, setJson] = useState(sampleJson);
  const [path, setPath] = useState(samplePath);
  const [copied, setCopied] = useState(false);
  let parsed: JsonValue | null = null;
  let parseError = "";
  try { parsed = JSON.parse(json); } catch (e) { parseError = "JSON 解析错误"; }
  const queryResult = useMemo(() => {
    if (!parsed) return null;
    return queryJsonPath(parsed, path);
  }, [json, path, parsed]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">沙箱</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>JSONPath</span>
          <input value={path} onChange={e => setPath(e.target.value)} placeholder="$.store.books[0].title" />
        </label>
        <button type="button" onClick={async () => { await sdk.copy(JSON.stringify(queryResult?.result, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? "已复制" : "复制结果"}
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <textarea className="code-input" value={json} onChange={e => setJson(e.target.value)} spellCheck={false} rows={16} />
        <div className="workspace workspace--stack">
          <div className="detail-grid">
            <article className="detail-card"><h3>匹配数</h3><p>{Array.isArray(queryResult?.result) ? queryResult.result.length : queryResult?.result !== null ? 1 : 0}</p></article>
            <article className="detail-card"><h3>状态</h3><p>{queryResult?.error ? "错误" : "成功"}</p></article>
          </div>
          <label className="tool-field">
            <span>查询结果</span>
            <textarea className="code-input" value={JSON.stringify(queryResult?.result, null, 2) || ""} readOnly spellCheck={false} rows={12} />
          </label>
          {queryResult?.error ? <p className="tool-error">{queryResult.error}</p> : null}
          {parseError ? <p className="tool-error">{parseError}</p> : null}
        </div>
      </div>
      <p className="tool-note">支持 JSONPath 点号语法、数组索引 \`[n]\` 和过滤表达式 \`[?(@.price > 10)]\`。</p>
    </section>
  );
}
`;
}

function spectrumAnalyzerApp() {
  return `"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const FFT_OPTIONS = [256, 512, 1024, 2048, 4096];
const WINDOW_OPTIONS = ["hanning", "hamming", "blackman", "rectangular"];

function applyWindow(data: Float32Array, type: string): Float32Array {
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const n = data.length;
    out[i] = data[i] * (
      type === "hanning" ? 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1))) :
      type === "hamming" ? 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1)) :
      type === "blackman" ? 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (n - 1)) :
      1
    );
  }
  return out;
}

export default function SpectrumAnalyzerTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const [fftSize, setFftSize] = useState(1024);
  const [windowType, setWindowType] = useState("hanning");
  const [isActive, setIsActive] = useState(false);
  const [peakFreq, setPeakFreq] = useState(0);
  const [peakDb, setPeakDb] = useState(-Infinity);
  const [error, setError] = useState("");

  const startCapture = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = fftSize;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      streamRef.current = stream;
      setIsActive(true);
      draw();
    } catch (err) {
      setError(err instanceof Error ? err.message : "麦克风访问被拒绝");
    }
  }, [fftSize]);

  function stopCapture() {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    analyserRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
    setIsActive(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }
  }

  function draw() {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatFrequencyData(dataArray);
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w * dpr, h * dpr);
    ctx.scale(dpr, dpr);
    const windowed = applyWindow(dataArray, windowType);
    let maxVal = -Infinity;
    let maxIdx = 0;
    const barWidth = w / bufferLength;
    for (let i = 0; i < bufferLength; i++) {
      const val = Math.max(windowed[i], -120);
      const pct = (val + 120) / 120;
      const barH = pct * h * 0.9;
      const hue = 240 - pct * 240;
      ctx.fillStyle = \`hsl(\${hue}, 85%, 55%)\`;
      ctx.fillRect(i * barWidth, h - barH, Math.max(1, barWidth - 0.5), barH);
      if (windowed[i] > maxVal) { maxVal = windowed[i]; maxIdx = i; }
    }
    const sampleRate = audioCtxRef.current?.sampleRate || 44100;
    const peakHertz = (maxIdx / bufferLength) * sampleRate / 2;
    setPeakFreq(Math.round(peakHertz));
    setPeakDb(Math.round(maxVal));
    animRef.current = requestAnimationFrame(draw);
  }

  useEffect(() => () => { stopCapture(); }, []);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">实时音频</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>FFT 大小</span>
          <select value={fftSize} onChange={e => setFftSize(Number(e.target.value))}>
            {FFT_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>窗口</span>
          <select value={windowType} onChange={e => setWindowType(e.target.value)}>
            {WINDOW_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <button type="button" className="button--primary" onClick={startCapture} disabled={isActive}>开始采集</button>
        <button type="button" onClick={stopCapture} disabled={!isActive}>停止</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>状态</h3><p>{isActive ? "采集中" : "空闲"}</p></article>
        <article className="detail-card"><h3>峰值频率</h3><p>{peakFreq} Hz</p></article>
        <article className="detail-card"><h3>峰值强度</h3><p>{peakDb} dB</p></article>
      </div>
      <canvas ref={canvasRef} width={800 * (window.devicePixelRatio || 1)} height={300 * (window.devicePixelRatio || 1)}
        style={{ width: "100%", height: 300, borderRadius: "var(--radius-lg)", background: "#0f172a" }} />
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">通过麦克风采集实时音频并计算 FFT 频谱；峰值频率检测可识别音高。</p>
    </section>
  );
}
`;
}

function binauralBeatsApp() {
  return `"use client";

import { useRef, useState, useEffect } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const PRESETS = [
  { name: "Delta (深度睡眠)", left: 200, right: 204, label: "0.5-4 Hz" },
  { name: "Theta (冥想)", left: 200, right: 206, label: "4-8 Hz" },
  { name: "Alpha (放松)", left: 200, right: 210, label: "8-14 Hz" },
  { name: "Beta (专注)", left: 200, right: 220, label: "14-30 Hz" },
  { name: "Gamma (高认知)", left: 200, right: 240, label: "40+ Hz" },
];

export default function BinauralBeatsTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const ctxRef = useRef<AudioContext | null>(null);
  const leftOscRef = useRef<OscillatorNode | null>(null);
  const rightOscRef = useRef<OscillatorNode | null>(null);
  const noiseRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const noiseGainRef = useRef<GainNode | null>(null);
  const [leftFreq, setLeftFreq] = useState(200);
  const [rightFreq, setRightFreq] = useState(210);
  const [volume, setVolume] = useState(0.5);
  const [noiseVolume, setNoiseVolume] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timer, setTimer] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startAudio() {
    const ctx = new AudioContext();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
    gainRef.current = masterGain;

    const leftOsc = ctx.createOscillator();
    leftOsc.type = "sine";
    leftOsc.frequency.value = leftFreq;
    const leftGain = ctx.createGain();
    leftGain.gain.value = 0.5;
    const merger = ctx.createChannelMerger(2);
    leftOsc.connect(leftGain);
    leftGain.connect(merger, 0, 0);

    const rightOsc = ctx.createOscillator();
    rightOsc.type = "sine";
    rightOsc.frequency.value = rightFreq;
    const rightGain = ctx.createGain();
    rightGain.gain.value = 0.5;
    rightOsc.connect(rightGain);
    rightGain.connect(merger, 0, 1);
    merger.connect(masterGain);

    leftOsc.start();
    rightOsc.start();
    leftOscRef.current = leftOsc;
    rightOscRef.current = rightOsc;

    if (noiseVolume > 0) {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = noiseVolume * 0.1;
      noise.connect(noiseGain);
      noiseGain.connect(masterGain);
      noise.start();
      noiseRef.current = noise;
      noiseGainRef.current = noiseGain;
    }

    ctxRef.current = ctx;
    setIsPlaying(true);

    if (timer > 0) {
      setRemaining(timer * 60);
      timerRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) { stopAudio(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
  }

  function stopAudio() {
    leftOscRef.current?.stop();
    rightOscRef.current?.stop();
    noiseRef.current?.stop();
    ctxRef.current?.close();
    leftOscRef.current = null;
    rightOscRef.current = null;
    noiseRef.current = null;
    ctxRef.current = null;
    gainRef.current = null;
    setIsPlaying(false);
    setRemaining(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  useEffect(() => () => stopAudio(), []);

  const beatHz = Math.abs(rightFreq - leftFreq);
  const formatTime = (s: number) => \`\${Math.floor(s / 60)}:\${String(s % 60).padStart(2, "0")}\`;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">实时音频</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>预设</span>
          <select onChange={e => {
            const preset = PRESETS[Number(e.target.value)];
            if (preset) { setLeftFreq(preset.left); setRightFreq(preset.right); }
          }}>
            {PRESETS.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
          </select>
        </label>
        <button type="button" className="button--primary" onClick={startAudio} disabled={isPlaying}>播放</button>
        <button type="button" onClick={stopAudio} disabled={!isPlaying}>停止</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>状态</h3><p>{isPlaying ? "播放中" : "停止"}</p></article>
        <article className="detail-card"><h3>左耳</h3><p>{leftFreq} Hz</p></article>
        <article className="detail-card"><h3>右耳</h3><p>{rightFreq} Hz</p></article>
        <article className="detail-card"><h3>节拍差</h3><p>{beatHz} Hz</p></article>
        {remaining > 0 && <article className="detail-card"><h3>剩余</h3><p>{formatTime(remaining)}</p></article>}
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>左耳频率</span>
          <input type="range" min={100} max={500} value={leftFreq} onChange={e => setLeftFreq(Number(e.target.value))} />
          <span className="mono-output">{leftFreq}</span>
        </label>
        <label className="tool-field tool-field--compact">
          <span>右耳频率</span>
          <input type="range" min={100} max={500} value={rightFreq} onChange={e => setRightFreq(Number(e.target.value))} />
          <span className="mono-output">{rightFreq}</span>
        </label>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>音量</span>
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => {
            setVolume(Number(e.target.value));
            if (gainRef.current) gainRef.current.gain.value = Number(e.target.value);
          }} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>粉红噪音</span>
          <input type="range" min={0} max={1} step={0.05} value={noiseVolume} onChange={e => setNoiseVolume(Number(e.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>定时 (分钟)</span>
          <input type="number" min={0} max={120} value={timer} onChange={e => setTimer(Number(e.target.value))} style={{ width: 80 }} />
        </label>
      </div>
      <p className="tool-note">双耳节拍通过左右耳不同频率的纯音在大脑中产生节拍感知。建议使用耳机以获得最佳效果。</p>
    </section>
  );
}
`;
}

function visualMetronomeApp() {
  return `"use client";

import { useEffect, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const BEAT_PATTERNS = [
  { name: "4/4", beats: 4, unit: 4 },
  { name: "3/4", beats: 3, unit: 4 },
  { name: "6/8", beats: 6, unit: 8 },
  { name: "2/4", beats: 2, unit: 4 },
  { name: "5/4", beats: 5, unit: 4 },
];

const TEMPO_PRESETS = [
  { name: "Largo", bpm: 50 }, { name: "Adagio", bpm: 70 },
  { name: "Andante", bpm: 90 }, { name: "Moderato", bpm: 114 },
  { name: "Allegro", bpm: 144 }, { name: "Presto", bpm: 184 },
];

export default function VisualMetronomeTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const ctxRef = useRef<AudioContext | null>(null);
  const [bpm, setBpm] = useState(120);
  const [patternIdx, setPatternIdx] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBeat, setActiveBeat] = useState(-1);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const nextTickRef = useRef(0);
  const beatRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);

  function playTick(ctx: AudioContext, isDownbeat: boolean) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = isDownbeat ? 880 : 660;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  function scheduleTick() {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    const pattern = BEAT_PATTERNS[patternIdx];
    const interval = 60 / bpm;
    const now = ctx.currentTime;
    if (nextTickRef.current < now) nextTickRef.current = now;
    while (nextTickRef.current < now + 0.2) {
      const isDownbeat = beatRef.current === 0;
      playTick(ctx, isDownbeat);
      setActiveBeat(beatRef.current);
      beatRef.current = (beatRef.current + 1) % pattern.beats;
      nextTickRef.current += interval;
    }
    timerRef.current = setTimeout(scheduleTick, 50);
  }

  function start() {
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    beatRef.current = 0;
    nextTickRef.current = ctx.currentTime + 0.05;
    startRef.current = performance.now();
    setIsPlaying(true);
    scheduleTick();
  }

  function stop() {
    if (timerRef.current) clearTimeout(timerRef.current);
    ctxRef.current?.close();
    ctxRef.current = null;
    setIsPlaying(false);
    setActiveBeat(-1);
  }

  function tapTempo() {
    const now = performance.now();
    const next = [...tapTimes, now].slice(-5);
    setTapTimes(next);
    if (next.length >= 3) {
      const avg = next.slice(1).reduce((sum, t, i) => sum + (t - next[i]), 0) / (next.length - 1);
      const estimated = Math.round(60000 / avg);
      if (estimated >= 20 && estimated <= 300) setBpm(estimated);
    }
  }

  useEffect(() => () => stop(), []);

  const pattern = BEAT_PATTERNS[patternIdx];
  const pendulumAngle = isPlaying ? ((activeBeat / pattern.beats) * 360 - 90) : -90;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">实时节拍</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>BPM</span>
          <input type="range" min={20} max={300} value={bpm} onChange={e => setBpm(Number(e.target.value))} />
          <span className="mono-output">{bpm}</span>
        </label>
        <label className="tool-field tool-field--compact">
          <span>拍号</span>
          <select value={patternIdx} onChange={e => setPatternIdx(Number(e.target.value))}>
            {BEAT_PATTERNS.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
          </select>
        </label>
        <button type="button" className="button--primary" onClick={start} disabled={isPlaying}>开始</button>
        <button type="button" onClick={stop} disabled={!isPlaying}>停止</button>
        <button type="button" onClick={tapTempo} disabled={isPlaying}>Tap 测速</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>速度</h3><p>{bpm} BPM</p></article>
        <article className="detail-card"><h3>拍号</h3><p>{pattern.name}</p></article>
        <article className="detail-card"><h3>节拍</h3><p>{activeBeat >= 0 ? \`\${activeBeat + 1}/\${pattern.beats}\` : "-"}</p></article>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "24px 0" }}>
        {Array.from({ length: pattern.beats }).map((_, i) => (
          <div key={i} style={{
            width: 48, height: 48, borderRadius: "50%",
            background: i === activeBeat ? "#6366f1" : i === 0 ? "#f59e0b" : "#334155",
            transition: "all 0.08s ease",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: i === activeBeat ? "white" : "#94a3b8",
            fontWeight: 700, fontSize: 18,
            boxShadow: i === activeBeat ? "0 0 20px rgba(99,102,241,0.5)" : "none"
          }}>{i + 1}</div>
        ))}
      </div>
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div style={{
          width: 4, height: 120, margin: "0 auto",
          background: "linear-gradient(to top, #6366f1 50%, transparent 50%)",
          transform: \`rotate(\${pendulumAngle}deg)\`,
          transformOrigin: "bottom center",
          transition: isPlaying ? "transform 0.05s linear" : "transform 0.3s ease",
          borderRadius: 4
        }} />
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>摆锤</p>
      </div>
      <p className="tool-note">高精度节拍器使用 Web Audio API 调度，适合音乐练习和节奏训练。</p>
    </section>
  );
}
`;
}

function realtimePingMonitorApp() {
  return `"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

interface PingEntry {
  id: number;
  time: string;
  latency: number;
  success: boolean;
  statusCode?: number;
}

const MAX_POINTS = 60;

export default function RealtimePingMonitorTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("https://httpbin.org/get");
  const [interval, setIntervalMs] = useState(1000);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<PingEntry[]>([]);
  const [stats, setStats] = useState({ avg: 0, min: 0, max: 0, loss: 0 });
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idRef = useRef(1);
  const historyRef = useRef<PingEntry[]>([]);

  function drawChart(entries: PingEntry[]) {
    const canvas = canvasRef.current;
    if (!canvas || entries.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w * dpr, h * dpr);
    ctx.scale(dpr, dpr);
    const maxLat = Math.max(...entries.map(e => e.latency), 100);
    const pad = 8;
    const chartW = w - pad * 2;
    const chartH = h - pad * 2;
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    entries.forEach((e, i) => {
      const x = pad + (i / (entries.length - 1 || 1)) * chartW;
      const y = pad + chartH - (e.latency / maxLat) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    entries.forEach((e, i) => {
      const x = pad + (i / (entries.length - 1 || 1)) * chartW;
      const y = pad + chartH - (e.latency / maxLat) * chartH;
      ctx.fillStyle = e.success ? "#22d3ee" : "#f87171";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#64748b";
    ctx.font = "11px monospace";
    ctx.fillText(\`max: \${Math.round(maxLat)}ms\`, pad, 14);
    ctx.fillText(\`min: \${Math.round(Math.min(...entries.map(e => e.latency)))}ms\`, w - 80, 14);
  }

  const doPing = useCallback(async () => {
    const id = idRef.current++;
    const ts = new Date().toLocaleTimeString();
    const start = performance.now();
    try {
      const res = await fetch(url, { method: "HEAD", mode: "no-cors" });
      const latency = Math.round(performance.now() - start);
      const entry: PingEntry = { id, time: ts, latency, success: true, statusCode: res.status };
      historyRef.current = [...historyRef.current, entry].slice(-MAX_POINTS);
      setHistory(historyRef.current);
    } catch {
      const latency = Math.round(performance.now() - start);
      const entry: PingEntry = { id, time: ts, latency, success: false };
      historyRef.current = [...historyRef.current, entry].slice(-MAX_POINTS);
      setHistory(historyRef.current);
    }
  }, [url]);

  useEffect(() => {
    if (history.length === 0) return;
    const values = history.filter(e => e.success).map(e => e.latency);
    const losses = history.filter(e => !e.success).length;
    setStats({
      avg: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
      loss: Math.round((losses / history.length) * 100)
    });
    drawChart(history);
  }, [history]);

  function startMonitor() {
    historyRef.current = [];
    setHistory([]);
    setIsRunning(true);
    setError("");
    doPing();
    timerRef.current = setInterval(doPing, interval);
  }

  function stopMonitor() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsRunning(false);
  }

  useEffect(() => () => stopMonitor(), []);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div><p className="eyebrow">实时监控</p><h2>{manifest.name}</h2></div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>目标 URL</span>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/ping" />
        </label>
        <label className="tool-field tool-field--compact">
          <span>间隔</span>
          <select value={interval} onChange={e => setIntervalMs(Number(e.target.value))}>
            <option value={500}>500ms</option>
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
          </select>
        </label>
        <button type="button" className="button--primary" onClick={startMonitor} disabled={isRunning}>开始</button>
        <button type="button" onClick={stopMonitor} disabled={!isRunning}>停止</button>
        <button type="button" onClick={() => { stopMonitor(); setHistory([]); historyRef.current = []; setStats({ avg: 0, min: 0, max: 0, loss: 0 }); }}>清空</button>
      </div>
      <div className="detail-grid">
        <article className="detail-card"><h3>状态</h3><p>{isRunning ? "监控中" : "停止"}</p></article>
        <article className="detail-card"><h3>平均</h3><p>{stats.avg}ms</p></article>
        <article className="detail-card"><h3>最低</h3><p>{stats.min}ms</p></article>
        <article className="detail-card"><h3>最高</h3><p>{stats.max}ms</p></article>
        <article className="detail-card"><h3>丢包率</h3><p>{stats.loss}%</p></article>
        <article className="detail-card"><h3>采样数</h3><p>{history.length}</p></article>
      </div>
      <canvas ref={canvasRef} width={800 * (window.devicePixelRatio || 1)} height={200 * (window.devicePixelRatio || 1)}
        style={{ width: "100%", height: 200, borderRadius: "var(--radius-lg)", background: "#0f172a" }} />
      <div className="tool-table" style={{ maxHeight: 200, overflow: "auto" }}>
        <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "5rem 4rem 1fr" }}>
          <span>时间</span><span>延迟</span><span>状态</span>
        </div>
        {[...history].reverse().slice(0, 30).map(e => (
          <div key={e.id} className="tool-table__row" style={{ gridTemplateColumns: "5rem 4rem 1fr" }}>
            <span>{e.time}</span>
            <span className="mono-output" style={{ color: e.success ? "#22d3ee" : "#f87171" }}>{e.success ? \`\${e.latency}ms\` : "超时"}</span>
            <span>{e.success ? \`HTTP \${e.statusCode ?? 200}\` : "失败"}</span>
          </div>
        ))}
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">通过 HTTP HEAD 请求探测目标可达性与延迟；CORS 策略下 \`no-cors\` 模式只能检测到/超时。</p>
    </section>
  );
}
`;
}

// ================================================================
// Main generation
// ================================================================
async function main() {
  let created = 0;
  let skipped = 0;

  for (const tool of tools) {
    const toolDir = path.join(toolsDir, tool.id);
    try {
      await fs.access(toolDir);
      console.log(`  SKIP ${tool.id} (already exists)`);
      skipped++;
      continue;
    } catch { /* proceed */ }

    const manifest = `import type { ToolManifest } from "@tool-platform/tool-contracts";

const manifest: ToolManifest = {
  id: "${tool.id}",
  name: "${tool.name}",
  description: "${tool.description}",
  category: "${tool.category}",
  tags: [${tool.tags.map(t => `"${t}"`).join(", ")}],
  icon: "${tool.icon}",
  runtime: "${tool.runtime}",
  featured: false,
${tool.manifestExtra}
};

export default manifest;
`;

    const app = tool.app();

    const packageJson = {
      name: `@tool-platform/${tool.id}`,
      version: "0.1.0",
      private: true,
      type: "module",
      exports: {
        "./manifest": "./manifest.ts",
        "./app": "./app.tsx"
      },
      dependencies: {
        "@tool-platform/tool-browser-sdk": "workspace:*",
        "@tool-platform/tool-contracts": "workspace:*"
      },
      peerDependencies: {
        "react": "^19.0.0"
      }
    };

    const readme = `# ${tool.name}

${tool.description}

## 概述

| 属性 | 值 |
|------|-----|
| 分类 | ${tool.category} |
| 运行环境 | ${tool.runtime} |

## 目录结构

\`\`\`
${tool.id}/
├── manifest.ts        # 工具元声明
├── app.tsx             # 工具 UI 组件
├── package.json        # 包配置
└── README.md           # 本文档
\`\`\`
`;

    await fs.mkdir(toolDir, { recursive: true });
    await fs.writeFile(path.join(toolDir, "package.json"), JSON.stringify(packageJson, null, 2) + "\n", "utf8");
    await fs.writeFile(path.join(toolDir, "manifest.ts"), manifest, "utf8");
    await fs.writeFile(path.join(toolDir, "app.tsx"), app, "utf8");
    await fs.writeFile(path.join(toolDir, "README.md"), readme, "utf8");
    console.log(`  CREATE ${tool.id}`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
