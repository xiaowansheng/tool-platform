"use client";

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
    sections.push({ name: names[id] ?? `Custom(${id})`, offset, size: len });
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
      setError("${file.name} 不是有效的 WASM 文件"); return;
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
          <div><h3>{left?.name ?? "未选择"}</h3><p className="mono-output">大小: {left ? `${(left.size / 1024).toFixed(1)} KB` : "-"}</p>
            <div className="tool-table">
              <div className="tool-table__row tool-table__row--head"><span>Section</span><span>大小</span></div>
              {allSectionNames.map(name => {
                const s = left?.sections.find(s => s.name === name);
                return <div key={name} className="tool-table__row"><span>{name}</span><span>{s ? `${s.size} B` : "-"}</span></div>;
              })}
            </div>
          </div>
          <div><h3>{right?.name ?? "未选择"}</h3><p className="mono-output">大小: {right ? `${(right.size / 1024).toFixed(1)} KB` : "-"}</p>
            <div className="tool-table">
              <div className="tool-table__row tool-table__row--head"><span>Section</span><span>大小</span></div>
              {allSectionNames.map(name => {
                const s = right?.sections.find(s => s.name === name);
                return <div key={name} className="tool-table__row"><span>{name}</span><span>{s ? `${s.size} B` : "-"}</span></div>;
              })}
            </div>
          </div>
        </div>
      ) : <p className="tool-note">请选择两个 WASM 模块进行对比</p>}
      {left && right && (
        <div className="detail-grid">
          <article className="detail-card"><h3>大小差异</h3><p>{right.size > left.size ? "+" : ""}${((right.size - left.size) / 1024).toFixed(1)} KB</p></article>
          <article className="detail-card"><h3>Section 差异</h3><p>{right.sections.length - left.sections.length > 0 ? "+" : ""}${right.sections.length - left.sections.length}</p></article>
        </div>
      )}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
