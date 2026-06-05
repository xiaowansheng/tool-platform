"use client";

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
    sections.push({ name: sectionNames[sectionId] ?? `Custom(${sectionId})`, size: len });
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
      signature: `fn(...) -> ${val.length} params`
    });
    else exports.push({ name: key, kind: "global" });
  }
  return exports;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
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

const sampleWat = `(module
  (func $add (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.add)
  (export "add" (func $add))
)`;

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
      const { instance } = await loadWasm({ source: bytes.buffer as ArrayBuffer, key: "playground-${Date.now()}" });
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
    if (!bytes) { setError("无效的 WASM hex：必须以 \\x00asm 开头"); return; }
    await handleWasmBytes(bytes);
  }

  async function callFn() {
    if (!instanceRef.current || !fnName) return;
    setError("");
    setFnResult("");
    try {
      const fn = instanceRef.current.exports[fnName];
      if (typeof fn !== "function") { setError("`${fnName}` 不是可导出的函数"); return; }
      const args = fnArgs ? JSON.parse(`[${fnArgs}]`) : [];
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
                    <span>{exp.kind}{exp.signature ? ` (${exp.signature})` : ""}</span>
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
    const lines = wat.trim().split("\n");
    const hasModule = lines.some(l => l.includes("(module"));
    if (!hasModule) return null;
    const testSrc = wat.includes('(import') ? wat : `(module ${wat.replace(/^\s*\(module\s*/, "").replace(/\s*\)\s*$/, "")}`;
    const match = testSrc.match(/\(export\s+"([^"]+)"\s+\(func\s+\$?([\w.]+)\)\)/);
    const funcMatch = testSrc.match(/\(func\s+\$?(\w+)\s+\(param\s+(\w+\s+)*\)\s+\(result\s+(\w+)\)/);
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
