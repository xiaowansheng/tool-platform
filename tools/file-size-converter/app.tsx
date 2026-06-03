"use client";

import { useState, useMemo } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Standard = "binary" | "decimal";

const binaryUnits = [
  { name: "B", factor: 1 },
  { name: "KiB", factor: 1024 },
  { name: "MiB", factor: 1024 ** 2 },
  { name: "GiB", factor: 1024 ** 3 },
  { name: "TiB", factor: 1024 ** 4 },
  { name: "PiB", factor: 1024 ** 5 }
];

const decimalUnits = [
  { name: "B", factor: 1 },
  { name: "KB", factor: 1000 },
  { name: "MB", factor: 1000 ** 2 },
  { name: "GB", factor: 1000 ** 3 },
  { name: "TB", factor: 1000 ** 4 },
  { name: "PB", factor: 1000 ** 5 }
];

function formatValue(v: number) {
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export default function FileSizeConverter({ manifest }: ToolAppProps) {
  const [standard, setStandard] = useState<Standard>("binary");
  const [value, setValue] = useState(1);
  const [fromUnit, setFromUnit] = useState("GiB");

  const units = standard === "binary" ? binaryUnits : decimalUnits;

  const results = useMemo(() => {
    const from = units.find((u) => u.name === fromUnit) ?? units[0];
    const bytes = value * from.factor;
    return units.map((u) => ({
      name: u.name,
      value: bytes / u.factor
    }));
  }, [value, fromUnit, standard, units]);

  // Reset fromUnit when switching standards
  function switchStandard(next: Standard) {
    setStandard(next);
    setFromUnit("B");
    setValue(1);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文件工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>换算标准</span>
          <select value={standard} onChange={(e) => switchStandard(e.target.value as Standard)}>
            <option value="binary">二进制 (1024, KiB/MiB)</option>
            <option value="decimal">十进制 (1000, KB/MB)</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>数值</span>
          <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} min={0} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>来源单位</span>
          <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)}>
            {units.map((u) => (
              <option key={u.name} value={u.name}>{u.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="detail-grid">
        {results.map((r) => (
          <article key={r.name} className="detail-card">
            <h3>{r.name}</h3>
            <p>{formatValue(r.value)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
