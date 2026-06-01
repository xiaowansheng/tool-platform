"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const unitGroups = {
  length: {
    label: "长度",
    base: "m",
    units: {
      mm: 0.001,
      cm: 0.01,
      m: 1,
      km: 1000,
      inch: 0.0254,
      ft: 0.3048,
      mile: 1609.344
    }
  },
  weight: {
    label: "重量",
    base: "kg",
    units: {
      mg: 0.000001,
      g: 0.001,
      kg: 1,
      oz: 0.0283495231,
      lb: 0.45359237
    }
  },
  data: {
    label: "数据大小",
    base: "byte",
    units: {
      B: 1,
      KB: 1024,
      MB: 1024 ** 2,
      GB: 1024 ** 3,
      TB: 1024 ** 4
    }
  }
} as const;

type UnitGroupKey = keyof typeof unitGroups;
type UnitKey<T extends UnitGroupKey> = keyof (typeof unitGroups)[T]["units"];

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function convertTemperature(value: number, from: string) {
  const celsius = from === "C" ? value : from === "F" ? (value - 32) * 5 / 9 : value - 273.15;

  return {
    C: celsius,
    F: celsius * 9 / 5 + 32,
    K: celsius + 273.15
  };
}

export default function UnitConverterTool({ manifest }: ToolClientProps) {
  const [group, setGroup] = useState<UnitGroupKey | "temperature">("length");
  const [value, setValue] = useState(1);
  const [fromUnit, setFromUnit] = useState("m");

  const availableUnits = group === "temperature"
    ? ["C", "F", "K"]
    : Object.keys(unitGroups[group].units);

  function updateGroup(nextGroup: UnitGroupKey | "temperature") {
    setGroup(nextGroup);
    setFromUnit(nextGroup === "temperature" ? "C" : Object.keys(unitGroups[nextGroup].units)[0] ?? "");
  }

  const results = group === "temperature"
    ? convertTemperature(value, fromUnit)
    : Object.fromEntries(
      Object.entries(unitGroups[group].units).map(([unit, factor]) => {
        const baseValue = value * (unitGroups[group].units[fromUnit as UnitKey<typeof group>] ?? 1);

        return [unit, baseValue / factor];
      })
    );

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">效率工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>类型</span>
          <select value={group} onChange={(event) => updateGroup(event.target.value as UnitGroupKey | "temperature")}>
            {Object.entries(unitGroups).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
            <option value="temperature">温度</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>数值</span>
          <input type="number" value={value} onChange={(event) => setValue(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>来源单位</span>
          <select value={fromUnit} onChange={(event) => setFromUnit(event.target.value)}>
            {availableUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="detail-grid">
        {Object.entries(results).map(([unit, converted]) => (
          <article key={unit} className="detail-card">
            <h3>{unit}</h3>
            <p>{formatNumber(converted)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
