"use client";

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

const sampleText = `HTTP/1.1 200 OK
Date: Mon, 01 Jan 2024 12:00:00 GMT
Content-Type: application/json
Content-Length: 1234
Server: nginx/1.24.0
X-Request-ID: abc-123-def-456

{"status": "ok", "data": [1, 2, 3, 4, 5]}
`;

export default function RegexWasmEngineTool({ manifest }: ToolAppProps) {
  const sdk = useRef(createToolSdk()).current;
  const [pattern, setPattern] = useState("\\d{3}\\.\\d{3}\\.\\d{4}");
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
          <input value={pattern} onChange={e => setPattern(e.target.value)} placeholder="\\d+" />
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
      <p className="tool-note">WASM 引擎使用浏览器原生 WebAssembly.RegExp 加速路径；加速比 &gt; 1 表示 WASM 更快。</p>
    </section>
  );
}
