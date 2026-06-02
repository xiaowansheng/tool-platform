"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type ResourceGroup = "cpu" | "memory" | "storage";

interface UnitDef {
  unit: string;
  label: string;
  factor: number;
}

const unitGroups: Record<ResourceGroup, { label: string; base: string; units: UnitDef[] }> = {
  cpu: {
    label: "CPU",
    base: "core",
    units: [
      { unit: "core", label: "Core", factor: 1 },
      { unit: "m", label: "Millicore", factor: 0.001 },
      { unit: "n", label: "Nanocore", factor: 0.000000001 }
    ]
  },
  memory: {
    label: "Memory",
    base: "byte",
    units: [
      { unit: "B", label: "Bytes", factor: 1 },
      { unit: "Ki", label: "Kibibytes", factor: 1024 },
      { unit: "Mi", label: "Mebibytes", factor: 1024 ** 2 },
      { unit: "Gi", label: "Gibibytes", factor: 1024 ** 3 },
      { unit: "KB", label: "Kilobytes", factor: 1000 },
      { unit: "MB", label: "Megabytes", factor: 1000 ** 2 },
      { unit: "GB", label: "Gigabytes", factor: 1000 ** 3 }
    ]
  },
  storage: {
    label: "Storage",
    base: "byte",
    units: [
      { unit: "B", label: "Bytes", factor: 1 },
      { unit: "Ki", label: "Kibibytes", factor: 1024 },
      { unit: "Mi", label: "Mebibytes", factor: 1024 ** 2 },
      { unit: "Gi", label: "Gibibytes", factor: 1024 ** 3 },
      { unit: "Ti", label: "Tebibytes", factor: 1024 ** 4 },
      { unit: "KB", label: "Kilobytes", factor: 1000 },
      { unit: "MB", label: "Megabytes", factor: 1000 ** 2 },
      { unit: "GB", label: "Gigabytes", factor: 1000 ** 3 },
      { unit: "TB", label: "Terabytes", factor: 1000 ** 4 }
    ]
  }
};

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return value.toLocaleString();

  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function convert(value: number, fromUnit: string, group: ResourceGroup) {
  const meta = unitGroups[group];
  const from = meta.units.find((unit) => unit.unit === fromUnit) ?? meta.units[0] as UnitDef;
  const baseValue = value * from.factor;

  return meta.units.map((unit) => ({
    ...unit,
    value: baseValue / unit.factor
  }));
}

function kubernetesSnippet(group: ResourceGroup, value: number, unit: string) {
  if (group === "cpu") {
    const millicores = convert(value, unit, group).find((item) => item.unit === "m")?.value ?? 0;

    return `resources:
  requests:
    cpu: ${Math.round(millicores)}m
  limits:
    cpu: ${Math.round(millicores * 2)}m`;
  }

  const converted = convert(value, unit, group);
  const mebibytes = converted.find((item) => item.unit === "Mi")?.value ?? 0;
  const key = group === "memory" ? "memory" : "ephemeral-storage";

  return `resources:
  requests:
    ${key}: ${Math.round(mebibytes)}Mi
  limits:
    ${key}: ${Math.round(mebibytes * 2)}Mi`;
}

const defaultInputs: Record<ResourceGroup, { value: number; unit: string }> = {
  cpu: { value: 250, unit: "m" },
  memory: { value: 256, unit: "Mi" },
  storage: { value: 1, unit: "Gi" }
};

export default function ResourceUnitConverterTool({ manifest }: ToolAppProps) {
  const [group, setGroup] = useState<ResourceGroup>("cpu");
  const [value, setValue] = useState(defaultInputs.cpu.value);
  const [fromUnit, setFromUnit] = useState(defaultInputs.cpu.unit);
  const meta = unitGroups[group];
  const results = convert(value, fromUnit, group);

  function updateGroup(nextGroup: ResourceGroup) {
    const defaults = defaultInputs[nextGroup];

    setGroup(nextGroup);
    setFromUnit(defaults.unit);
    setValue(defaults.value);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Kubernetes 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>资源类型</span>
          <select value={group} onChange={(event) => updateGroup(event.target.value as ResourceGroup)}>
            {Object.entries(unitGroups).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>数值</span>
          <input type="number" value={value} onChange={(event) => setValue(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>来源单位</span>
          <select value={fromUnit} onChange={(event) => setFromUnit(event.target.value)}>
            {meta.units.map((unit) => <option key={unit.unit} value={unit.unit}>{unit.unit} - {unit.label}</option>)}
          </select>
        </label>
      </div>
      <div className="detail-grid">
        {results.map((unit) => (
          <article key={unit.unit} className="detail-card">
            <h3>{unit.unit}</h3>
            <p>{formatNumber(unit.value)}</p>
          </article>
        ))}
      </div>
      <label className="tool-field">
        <span>Kubernetes requests/limits 参考</span>
        <textarea value={kubernetesSnippet(group, value, fromUnit)} readOnly spellCheck={false} />
      </label>
      <p className="tool-note">CPU 使用 1 core = 1000m；内存和 Kubernetes 资源建议优先使用 Ki/Mi/Gi 二进制单位。</p>
    </section>
  );
}
