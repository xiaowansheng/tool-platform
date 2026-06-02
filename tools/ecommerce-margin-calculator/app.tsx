"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function calculate(input: {
  price: number;
  unitCost: number;
  platformFeeRate: number;
  paymentFeeRate: number;
  adSpend: number;
  shipping: number;
  returnRate: number;
  targetMargin: number;
}) {
  const platformFee = input.price * input.platformFeeRate / 100;
  const paymentFee = input.price * input.paymentFeeRate / 100;
  const expectedReturnCost = input.unitCost * input.returnRate / 100;
  const totalCost = input.unitCost + platformFee + paymentFee + input.adSpend + input.shipping + expectedReturnCost;
  const profit = input.price - totalCost;
  const margin = input.price > 0 ? profit / input.price * 100 : 0;
  const roasBreakEven = input.adSpend > 0 ? input.price / input.adSpend : 0;
  const fixedCostWithoutPriceFees = input.unitCost + input.adSpend + input.shipping + expectedReturnCost;
  const feeRate = (input.platformFeeRate + input.paymentFeeRate) / 100;
  const suggestedPrice = fixedCostWithoutPriceFees / Math.max(0.01, 1 - feeRate - input.targetMargin / 100);

  return {
    platformFee,
    paymentFee,
    expectedReturnCost,
    totalCost,
    profit,
    margin,
    roasBreakEven,
    suggestedPrice
  };
}

export default function EcommerceMarginCalculatorTool({ manifest }: ToolAppProps) {
  const [price, setPrice] = useState(49);
  const [unitCost, setUnitCost] = useState(14);
  const [platformFeeRate, setPlatformFeeRate] = useState(12);
  const [paymentFeeRate, setPaymentFeeRate] = useState(2.9);
  const [adSpend, setAdSpend] = useState(8);
  const [shipping, setShipping] = useState(5);
  const [returnRate, setReturnRate] = useState(6);
  const [targetMargin, setTargetMargin] = useState(30);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const result = useMemo(() => calculate({ price, unitCost, platformFeeRate, paymentFeeRate, adSpend, shipping, returnRate, targetMargin }), [adSpend, paymentFeeRate, platformFeeRate, price, returnRate, shipping, targetMargin, unitCost]);
  const report = [
    `售价：${money(price)}`,
    `总成本：${money(result.totalCost)}`,
    `利润：${money(result.profit)}`,
    `毛利率：${result.margin.toFixed(1)}%`,
    `盈亏平衡 ROAS：${result.roasBreakEven.toFixed(2)}x`,
    `${targetMargin}% 目标毛利建议售价：${money(result.suggestedPrice)}`
  ].join("\n");

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
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
          <p className="eyebrow">电商工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>售价</span><input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>商品成本</span><input type="number" min="0" step="0.01" value={unitCost} onChange={(event) => setUnitCost(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>广告成本</span><input type="number" min="0" step="0.01" value={adSpend} onChange={(event) => setAdSpend(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>物流成本</span><input type="number" min="0" step="0.01" value={shipping} onChange={(event) => setShipping(Number(event.target.value))} /></label>
        <button type="button" onClick={() => void copyReport()}>{copied ? "已复制" : "复制报告"}</button>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact"><span>平台费 {platformFeeRate}%</span><input type="range" min="0" max="40" step="0.1" value={platformFeeRate} onChange={(event) => setPlatformFeeRate(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>支付费 {paymentFeeRate}%</span><input type="range" min="0" max="10" step="0.1" value={paymentFeeRate} onChange={(event) => setPaymentFeeRate(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>退货率 {returnRate}%</span><input type="range" min="0" max="50" step="0.5" value={returnRate} onChange={(event) => setReturnRate(Number(event.target.value))} /></label>
        <label className="tool-field tool-field--compact"><span>目标毛利 {targetMargin}%</span><input type="range" min="1" max="80" value={targetMargin} onChange={(event) => setTargetMargin(Number(event.target.value))} /></label>
      </div>

      <div className="detail-grid">
        <article className="detail-card"><h3>利润</h3><p>{money(result.profit)}</p></article>
        <article className="detail-card"><h3>毛利率</h3><p>{result.margin.toFixed(1)}%</p></article>
        <article className="detail-card"><h3>盈亏平衡 ROAS</h3><p>{result.roasBreakEven.toFixed(2)}x</p></article>
        <article className="detail-card"><h3>建议售价</h3><p>{money(result.suggestedPrice)}</p></article>
      </div>

      <div className="workspace workspace--two-column">
        <div className="tool-table">
          {[
            ["平台费", money(result.platformFee)],
            ["支付费", money(result.paymentFee)],
            ["退货预留", money(result.expectedReturnCost)],
            ["总成本", money(result.totalCost)]
          ].map(([label, value]) => <div className="tool-table__row" key={label}><span>{label}</span><span>{value}</span></div>)}
        </div>
        <label className="tool-field">
          <span>报告</span>
          <textarea value={report} readOnly spellCheck={false} />
        </label>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">该计算用于单品模型。实际定价还应纳入库存周转、税费、折扣券、仓储和渠道佣金差异。</p>
    </section>
  );
}
