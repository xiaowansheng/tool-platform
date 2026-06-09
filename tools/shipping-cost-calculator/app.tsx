"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const zones = { domestic: 1, regional: 1.45, international: 2.35 };
const methods = { economy: 1, standard: 1.35, express: 2.1 };

type Zone = keyof typeof zones;
type Method = keyof typeof methods;

function money(value: number) {
  return "$" + value.toFixed(2);
}

export default function ShippingCostCalculatorTool({ manifest }: ToolAppProps) {
  const [weight, setWeight] = useState(1.2);
  const [length, setLength] = useState(30);
  const [width, setWidth] = useState(20);
  const [height, setHeight] = useState(10);
  const [zone, setZone] = useState<Zone>("regional");
  const [method, setMethod] = useState<Method>("standard");
  const [handling, setHandling] = useState(2.5);
  const [insurance, setInsurance] = useState(0.8);
  const dimensionalWeight = useMemo(() => (length * width * height) / 5000, [height, length, width]);
  const billableWeight = Math.max(weight, dimensionalWeight);
  const base = 4.5 + billableWeight * 1.25 * zones[zone] * methods[method];
  const total = base + handling + insurance;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Logistics</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="detail-grid"><label className="tool-field tool-field--compact"><span>Weight kg</span><input type="number" min={0} step={0.1} value={weight} onChange={(event) => setWeight(Number(event.target.value))} /></label><label className="tool-field tool-field--compact"><span>Length cm</span><input type="number" min={1} value={length} onChange={(event) => setLength(Number(event.target.value))} /></label><label className="tool-field tool-field--compact"><span>Width cm</span><input type="number" min={1} value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label><label className="tool-field tool-field--compact"><span>Height cm</span><input type="number" min={1} value={height} onChange={(event) => setHeight(Number(event.target.value))} /></label><label className="tool-field tool-field--compact"><span>Zone</span><select value={zone} onChange={(event) => setZone(event.target.value as Zone)}><option value="domestic">Domestic</option><option value="regional">Regional</option><option value="international">International</option></select></label><label className="tool-field tool-field--compact"><span>Method</span><select value={method} onChange={(event) => setMethod(event.target.value as Method)}><option value="economy">Economy</option><option value="standard">Standard</option><option value="express">Express</option></select></label><label className="tool-field tool-field--compact"><span>Handling</span><input type="number" min={0} step={0.1} value={handling} onChange={(event) => setHandling(Number(event.target.value))} /></label><label className="tool-field tool-field--compact"><span>Insurance</span><input type="number" min={0} step={0.1} value={insurance} onChange={(event) => setInsurance(Number(event.target.value))} /></label></div>
      <div className="detail-grid"><article className="detail-card"><h3>Dimensional weight</h3><p>{dimensionalWeight.toFixed(2)} kg</p></article><article className="detail-card"><h3>Billable weight</h3><p>{billableWeight.toFixed(2)} kg</p></article><article className="detail-card"><h3>Base freight</h3><p>{money(base)}</p></article><article className="detail-card"><h3>Total</h3><p>{money(total)}</p></article></div>
      <label className="tool-field"><span>Quote summary</span><textarea readOnly value={["Zone: " + zone, "Method: " + method, "Billable weight: " + billableWeight.toFixed(2) + " kg", "Base: " + money(base), "Handling: " + money(handling), "Insurance: " + money(insurance), "Total: " + money(total)].join("\n")} /></label>
    </section>
  );
}
