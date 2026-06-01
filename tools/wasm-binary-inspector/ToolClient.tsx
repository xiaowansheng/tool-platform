"use client";

import { useMemo, useRef, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";
import { createToolSdk } from "@tool-platform/tool-browser-sdk";

const demoAddModule = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x07, 0x01, 0x60,
  0x02, 0x7f, 0x7f, 0x01, 0x7f, 0x03, 0x02, 0x01, 0x00, 0x07, 0x07, 0x01,
  0x03, 0x61, 0x64, 0x64, 0x00, 0x00, 0x0a, 0x09, 0x01, 0x07, 0x00, 0x20,
  0x00, 0x20, 0x01, 0x6a, 0x0b
]);

const sectionLabels: Record<number, string> = {
  0: "custom",
  1: "type",
  2: "import",
  3: "function",
  4: "table",
  5: "memory",
  6: "global",
  7: "export",
  8: "start",
  9: "element",
  10: "code",
  11: "data",
  12: "data-count",
  13: "tag"
};

const externalKindLabels: Record<number, string> = {
  0: "func",
  1: "table",
  2: "memory",
  3: "global",
  4: "tag"
};

interface WasmSectionReport {
  index: number;
  id: number;
  name: string;
  offset: number;
  payloadOffset: number;
  payloadLength: number;
  totalLength: number;
  count?: number;
  customName?: string;
}

interface WasmSymbolReport {
  module?: string;
  name: string;
  kind: string;
  index?: number;
}

interface WasmReport {
  fileName: string;
  size: number;
  magic: string;
  version: number;
  validMagic: boolean;
  sections: WasmSectionReport[];
  imports: WasmSymbolReport[];
  exports: WasmSymbolReport[];
  customSections: string[];
  typeCount: number;
  functionCount: number;
  tableCount: number;
  memoryCount: number;
  globalCount: number;
  codeBodyCount: number;
}

function readVarUint(bytes: Uint8Array, offset: number) {
  let value = 0;
  let shift = 0;
  let cursor = offset;

  while (cursor < bytes.length) {
    const byte = bytes[cursor] ?? 0;

    value |= (byte & 0x7f) << shift;
    cursor += 1;

    if ((byte & 0x80) === 0) {
      return {
        value,
        nextOffset: cursor
      };
    }

    shift += 7;

    if (shift > 35) {
      throw new Error("Invalid unsigned LEB128 value");
    }
  }

  throw new Error("Unexpected end of file while reading LEB128");
}

function readString(bytes: Uint8Array, offset: number, endOffset: number) {
  const length = readVarUint(bytes, offset);
  const stringEnd = length.nextOffset + length.value;

  if (stringEnd > endOffset) {
    throw new Error("String extends beyond section boundary");
  }

  return {
    value: new TextDecoder().decode(bytes.slice(length.nextOffset, stringEnd)),
    nextOffset: stringEnd
  };
}

function skipLimits(bytes: Uint8Array, offset: number) {
  const flag = bytes[offset] ?? 0;
  let cursor = offset + 1;

  cursor = readVarUint(bytes, cursor).nextOffset;

  if ((flag & 0x01) === 0x01) {
    cursor = readVarUint(bytes, cursor).nextOffset;
  }

  return cursor;
}

function skipExternalDescriptor(bytes: Uint8Array, offset: number, kind: number) {
  if (kind === 0) {
    return readVarUint(bytes, offset).nextOffset;
  }

  if (kind === 1) {
    return skipLimits(bytes, offset + 1);
  }

  if (kind === 2) {
    return skipLimits(bytes, offset);
  }

  if (kind === 3) {
    return offset + 2;
  }

  if (kind === 4) {
    return readVarUint(bytes, readVarUint(bytes, offset).nextOffset).nextOffset;
  }

  return offset;
}

function parseImportSection(bytes: Uint8Array, offset: number, endOffset: number) {
  const count = readVarUint(bytes, offset);
  let cursor = count.nextOffset;
  const imports: WasmSymbolReport[] = [];

  for (let index = 0; index < count.value && cursor < endOffset; index += 1) {
    const moduleName = readString(bytes, cursor, endOffset);
    const symbolName = readString(bytes, moduleName.nextOffset, endOffset);
    const kind = bytes[symbolName.nextOffset] ?? -1;
    const descriptorOffset = symbolName.nextOffset + 1;

    cursor = skipExternalDescriptor(bytes, descriptorOffset, kind);
    imports.push({
      module: moduleName.value,
      name: symbolName.value,
      kind: externalKindLabels[kind] ?? `kind-${kind}`
    });
  }

  return imports;
}

function parseExportSection(bytes: Uint8Array, offset: number, endOffset: number) {
  const count = readVarUint(bytes, offset);
  let cursor = count.nextOffset;
  const exports: WasmSymbolReport[] = [];

  for (let index = 0; index < count.value && cursor < endOffset; index += 1) {
    const symbolName = readString(bytes, cursor, endOffset);
    const kind = bytes[symbolName.nextOffset] ?? -1;
    const exportedIndex = readVarUint(bytes, symbolName.nextOffset + 1);

    cursor = exportedIndex.nextOffset;
    exports.push({
      name: symbolName.value,
      kind: externalKindLabels[kind] ?? `kind-${kind}`,
      index: exportedIndex.value
    });
  }

  return exports;
}

function parseWasm(bytes: Uint8Array, fileName: string): WasmReport {
  const validMagic = bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d;
  const version = bytes.length >= 8 ? bytes[4] + (bytes[5] << 8) + (bytes[6] << 16) + (bytes[7] << 24) : 0;

  if (bytes.length < 8 || !validMagic) {
    return {
      fileName,
      size: bytes.byteLength,
      magic: Array.from(bytes.slice(0, 4), (byte) => byte.toString(16).padStart(2, "0")).join(" "),
      version,
      validMagic,
      sections: [],
      imports: [],
      exports: [],
      customSections: [],
      typeCount: 0,
      functionCount: 0,
      tableCount: 0,
      memoryCount: 0,
      globalCount: 0,
      codeBodyCount: 0
    };
  }

  let offset = 8;
  const sections: WasmSectionReport[] = [];
  const imports: WasmSymbolReport[] = [];
  const exports: WasmSymbolReport[] = [];
  const customSections: string[] = [];
  const counts = {
    typeCount: 0,
    functionCount: 0,
    tableCount: 0,
    memoryCount: 0,
    globalCount: 0,
    codeBodyCount: 0
  };

  while (offset < bytes.length) {
    const sectionStart = offset;
    const id = bytes[offset] ?? 0;
    const sectionSize = readVarUint(bytes, offset + 1);
    const payloadOffset = sectionSize.nextOffset;
    const payloadEnd = payloadOffset + sectionSize.value;

    if (payloadEnd > bytes.length) {
      throw new Error(`Section ${sectionLabels[id] ?? id} extends beyond file size`);
    }

    const section: WasmSectionReport = {
      index: sections.length + 1,
      id,
      name: sectionLabels[id] ?? `unknown-${id}`,
      offset: sectionStart,
      payloadOffset,
      payloadLength: sectionSize.value,
      totalLength: payloadEnd - sectionStart
    };

    if ([1, 3, 4, 5, 6, 7, 9, 10, 11, 13].includes(id) && sectionSize.value > 0) {
      section.count = readVarUint(bytes, payloadOffset).value;
    }

    if (id === 0 && sectionSize.value > 0) {
      const customName = readString(bytes, payloadOffset, payloadEnd).value;

      section.customName = customName;
      customSections.push(customName);
    }

    if (id === 1) counts.typeCount = section.count ?? 0;
    if (id === 2) imports.push(...parseImportSection(bytes, payloadOffset, payloadEnd));
    if (id === 3) counts.functionCount = section.count ?? 0;
    if (id === 4) counts.tableCount = section.count ?? 0;
    if (id === 5) counts.memoryCount = section.count ?? 0;
    if (id === 6) counts.globalCount = section.count ?? 0;
    if (id === 7) exports.push(...parseExportSection(bytes, payloadOffset, payloadEnd));
    if (id === 10) counts.codeBodyCount = section.count ?? 0;

    sections.push(section);
    offset = payloadEnd;
  }

  return {
    fileName,
    size: bytes.byteLength,
    magic: "00 61 73 6d",
    version,
    validMagic,
    sections,
    imports,
    exports,
    customSections,
    ...counts
  };
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

export default function WasmBinaryInspectorTool({ manifest }: ToolClientProps) {
  const sdkRef = useRef<ReturnType<typeof createToolSdk> | null>(null);

  if (!sdkRef.current) {
    sdkRef.current = createToolSdk();
  }

  const sdk = sdkRef.current;
  const [fileName, setFileName] = useState("demo-add.wasm");
  const [bytes, setBytes] = useState<Uint8Array>(demoAddModule);
  const [report, setReport] = useState<WasmReport>(() => parseWasm(demoAddModule, "demo-add.wasm"));
  const [error, setError] = useState("");
  const [compileStatus, setCompileStatus] = useState("尚未编译校验");
  const [left, setLeft] = useState(21);
  const [right, setRight] = useState(21);
  const [demoResult, setDemoResult] = useState<number | null>(null);

  const reportJson = useMemo(() => JSON.stringify(report, null, 2), [report]);

  function loadBytes(nextBytes: Uint8Array, nextFileName: string) {
    setError("");
    setCompileStatus("尚未编译校验");
    setDemoResult(null);
    setFileName(nextFileName);
    setBytes(nextBytes);

    try {
      setReport(parseWasm(nextBytes, nextFileName));
    } catch (parseError) {
      setReport(parseWasm(new Uint8Array(), nextFileName));
      setError(parseError instanceof Error ? parseError.message : "WASM 解析失败");
    }
  }

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }

    loadBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  }

  async function compileCurrentModule() {
    setError("");
    setCompileStatus("编译中");

    try {
      await sdk.preloadWasm({
        key: `wasm-binary-inspector:${fileName}:${bytes.byteLength}`,
        source: bytes
      });
      setCompileStatus("编译通过，模块已进入 runtime cache");
    } catch (compileError) {
      setCompileStatus("编译失败");
      setError(compileError instanceof Error ? compileError.message : "WASM 编译失败");
    }
  }

  async function runDemoAdd() {
    setError("");

    try {
      const loaded = await sdk.loadWasm({
        key: "wasm-binary-inspector:demo-add",
        source: demoAddModule
      });
      const add = loaded.instance.exports.add;

      if (typeof add !== "function") {
        throw new Error("Demo module does not export add()");
      }

      setDemoResult((add as (a: number, b: number) => number)(left, right));
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "WASM demo 执行失败");
    }
  }

  async function copyReport() {
    try {
      await sdk.copy(reportJson);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">WASM 运行时</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>WASM 文件</span>
          <input type="file" accept=".wasm,application/wasm" onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} />
        </label>
        <button type="button" onClick={() => loadBytes(demoAddModule, "demo-add.wasm")}>加载 demo</button>
        <button type="button" onClick={() => void compileCurrentModule()} disabled={!report.validMagic}>编译校验</button>
        <button type="button" onClick={() => sdk.clearWasmCache()}>清空 WASM cache</button>
        <button type="button" onClick={() => void copyReport()} disabled={!report.validMagic}>复制报告</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>文件</h3>
          <p>{fileName}</p>
        </article>
        <article className="detail-card">
          <h3>大小</h3>
          <p>{formatBytes(report.size)}</p>
        </article>
        <article className="detail-card">
          <h3>版本</h3>
          <p>{report.validMagic ? report.version : "-"}</p>
        </article>
        <article className="detail-card">
          <h3>段</h3>
          <p>{report.sections.length}</p>
        </article>
        <article className="detail-card">
          <h3>导入</h3>
          <p>{report.imports.length}</p>
        </article>
        <article className="detail-card">
          <h3>导出</h3>
          <p>{report.exports.length}</p>
        </article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <div className="tool-results">
            <div>
              <p className="eyebrow">魔数</p>
              <strong>{report.validMagic ? "有效" : "无效"}</strong>
            </div>
            <div>
              <p className="eyebrow">编译</p>
              <strong>{compileStatus}</strong>
            </div>
          </div>

          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>段</span>
              <span>Offset / size / count</span>
            </div>
            {report.sections.map((section) => (
              <div className="tool-table__row" key={`${section.index}-${section.offset}`}>
                <span>{section.customName ? `${section.name}:${section.customName}` : section.name}</span>
                <span>
                  @{section.offset} / {formatBytes(section.payloadLength)}
                  {typeof section.count === "number" ? ` / ${section.count}` : ""}
                </span>
              </div>
            ))}
          </div>

          <div className="tool-toolbar tool-toolbar--grid">
            <label className="tool-field tool-field--compact">
              <span>演示 A</span>
              <input type="number" value={left} onChange={(event) => setLeft(Number(event.target.value))} />
            </label>
            <label className="tool-field tool-field--compact">
              <span>演示 B</span>
              <input type="number" value={right} onChange={(event) => setRight(Number(event.target.value))} />
            </label>
            <button type="button" onClick={() => void runDemoAdd()}>运行 add()</button>
            <div className="mono-output">结果：{demoResult ?? "-"}</div>
          </div>
        </div>

        <div className="workspace workspace--stack">
          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>符号</span>
              <span>种类</span>
            </div>
            {[...report.imports, ...report.exports].map((symbol, index) => (
              <div className="tool-table__row" key={`${symbol.name}-${index}`}>
                <span>{symbol.module ? `${symbol.module}.${symbol.name}` : symbol.name}</span>
                <span>{symbol.kind}{typeof symbol.index === "number" ? ` #${symbol.index}` : ""}</span>
              </div>
            ))}
            {report.imports.length + report.exports.length === 0 ? (
              <div className="tool-table__row">
                <span>-</span>
                <span>没有解析到 import/export</span>
              </div>
            ) : null}
          </div>

          <label className="tool-field">
            <span>结构化报告</span>
            <textarea value={reportJson} readOnly spellCheck={false} />
          </label>
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">编译校验只验证模块可被浏览器 WebAssembly runtime 编译；存在 import 的模块不需要实例化也能完成结构检查。</p>
    </section>
  );
}
