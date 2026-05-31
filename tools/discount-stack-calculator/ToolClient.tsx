"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface DiscountStep {
  label: string;
  amount: number;
  subtotal: number;
}

function parseDiscounts(input: string, initialSubtotal: number) {
  let subtotal = initialSubtotal;
  const steps: DiscountStep[] = [];

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const [, labelPart = line, valuePart = line] = line.match(/^(.*?)\s*\|\s*(.+)$/) ?? [];
    const value = valuePart.replace(/[$,\s]/g, "");
    const numeric = Number(value.replace("%", ""));

    if (!Number.isFinite(numeric)) {
      continue;
    }

    const amount = value.includes("%") ? subtotal * (numeric / 100) : numeric;
    subtotal = Math.max(0, subtotal - amount);
    steps.push({
      label: labelPart || line,
      amount,
      subtotal
    });
  }

  return { subtotal, steps };
}

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function DiscountStackCalculatorTool({ manifest }: ToolClientProps) {
  const [unitPrice, setUnitPrice] = useState(79);
  const [quantity, setQuantity] = useState(2);
  const [unitCost, setUnitCost] = useState(28);
  const [discounts, setDiscounts] = useState("首发优惠 | 15%\n优惠券 | $8");
  const [taxRate, setTaxRate] = useState(7.5);
  const [shipping, setShipping] = useState(6.99);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const result = useMemo(() => {
    const gross = Math.max(0, unitPrice) * Math.max(1, quantity);
    const parsed = parseDiscounts(discounts, gross);
    const tax = parsed.subtotal * (Math.max(0, taxRate) / 100);
    const total = parsed.subtotal + tax + Math.max(0, shipping);
    const cost = Math.max(0, unitCost) * Math.max(1, quantity);
    const profit = parsed.subtotal - cost;

    return {
      gross,
      subtotal: parsed.subtotal,
      steps: parsed.steps,
      tax,
      total,
      cost,
      profit,
      discountAmount: gross - parsed.subtotal,
      discountRate: gross > 0 ? ((gross - parsed.subtotal) / gross) * 100 : 0,
      margin: parsed.subtotal > 0 ? (profit / parsed.subtotal) * 100 : 0
    };
  }, [discounts, quantity, shipping, taxRate, unitCost, unitPrice]);
  const summary = [
    `原价合计：${money(result.gross)}`,
    ...result.steps.map((step) => `${step.label}: -${money(step.amount)} -> ${money(step.subtotal)}`),
    `税费：${money(result.tax)}`,
    `物流费：${money(shipping)}`,
    `客户支付总额：${money(result.total)}`,
    `税费和物流前净利润：${money(result.profit)}`,
    `毛利率：${result.margin.toFixed(1)}%`
  ].join("\n");

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">价格工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>单价</span><input type="number" min="0" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>数量</span><input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>单件成本</span><input type="number" min="0" step="0.01" value={unitCost} onChange={(event) => setUnitCost(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>税率 %</span><input type="number" min="0" step="0.1" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>物流费</span><input type="number" min="0" step="0.01" value={shipping} onChange={(event) => setShipping(Number(event.target.value))} /></label>
        <button type="button" onClick={() => void copySummary()}>{copied ? "已复制" : "复制摘要"}</button>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>原价合计</h3><p>{money(result.gross)}</p></article>
        <article className="detail-card"><h3>折扣</h3><p>{money(result.discountAmount)} ({result.discountRate.toFixed(1)}%)</p></article>
        <article className="detail-card"><h3>支付总额</h3><p>{money(result.total)}</p></article>
        <article className="detail-card"><h3>毛利率</h3><p>{result.margin.toFixed(1)}%</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>折扣规则，每行：名称 | 15% 或 名称 | $8</span>
          <textarea value={discounts} onChange={(event) => {
            setDiscounts(event.target.value);
            setCopied(false);
          }} />
        </label>
        <label className="tool-field">
          <span>订单摘要</span>
          <textarea value={summary} readOnly spellCheck={false} />
        </label>
      </div>

      {result.profit < 0 ? <p className="tool-error">当前折扣组合已导致商品毛利为负。</p> : null}
      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">计算结果用于活动方案预估，实际结算还要计入平台佣金、支付费、退款和税务规则。</p>
    </section>
  );
}
