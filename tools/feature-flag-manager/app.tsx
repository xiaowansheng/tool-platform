"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface EnvironmentRule {
  name: string;
  enabled: boolean;
  rollout: number;
}

const initialRules: EnvironmentRule[] = [
  { name: "development", enabled: true, rollout: 100 },
  { name: "staging", enabled: true, rollout: 50 },
  { name: "production", enabled: true, rollout: 15 }
];

function hashToPercent(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

function normalizePercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function FeatureFlagManagerTool({ manifest }: ToolAppProps) {
  const [flagKey, setFlagKey] = useState("checkout.new-payment-sheet");
  const [rules, setRules] = useState<EnvironmentRule[]>(initialRules);
  const [userId, setUserId] = useState("user_1042");
  const [environment, setEnvironment] = useState("production");
  const [segment, setSegment] = useState("beta");
  const [requiredSegment, setRequiredSegment] = useState("beta");
  const [copied, setCopied] = useState(false);
  const selectedRule = rules.find((rule) => rule.name === environment) ?? rules[0]!;
  const bucket = useMemo(() => hashToPercent(flagKey + ":" + environment + ":" + userId), [environment, flagKey, userId]);
  const matchedSegment = !requiredSegment.trim() || segment.trim().toLowerCase() === requiredSegment.trim().toLowerCase();
  const enabled = selectedRule.enabled && matchedSegment && bucket < selectedRule.rollout;
  const configText = useMemo(() => JSON.stringify({
    key: flagKey,
    targeting: { segment: requiredSegment || null, bucketing: "fnv1a-percent" },
    environments: Object.fromEntries(rules.map((rule) => [rule.name, { enabled: rule.enabled, rollout: rule.rollout }]))
  }, null, 2), [flagKey, requiredSegment, rules]);

  function updateRule(index: number, patch: Partial<EnvironmentRule>) {
    setRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule));
    setCopied(false);
  }

  async function copyConfig() {
    await navigator.clipboard.writeText(configText);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Release control</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar tool-toolbar--grid"><label className="tool-field tool-field--compact"><span>Flag key</span><input value={flagKey} onChange={(event) => setFlagKey(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>Required segment</span><input value={requiredSegment} onChange={(event) => setRequiredSegment(event.target.value)} /></label><button type="button" onClick={() => void copyConfig()}>{copied ? "Copied JSON" : "Copy JSON"}</button></div>
      <div className="detail-grid">{rules.map((rule, index) => <article className="detail-card" key={rule.name}><h3>{rule.name}</h3><label className="tool-field tool-field--compact"><span>Enabled</span><select value={rule.enabled ? "on" : "off"} onChange={(event) => updateRule(index, { enabled: event.target.value === "on" })}><option value="on">On</option><option value="off">Off</option></select></label><label className="tool-field tool-field--compact"><span>Rollout %</span><input type="number" min={0} max={100} value={rule.rollout} onChange={(event) => updateRule(index, { rollout: normalizePercent(Number(event.target.value)) })} /></label></article>)}</div>
      <div className="workspace workspace--two-column"><div className="detail-card"><h3>Evaluation</h3><label className="tool-field tool-field--compact"><span>Environment</span><select value={environment} onChange={(event) => setEnvironment(event.target.value)}>{rules.map((rule) => <option value={rule.name} key={rule.name}>{rule.name}</option>)}</select></label><label className="tool-field tool-field--compact"><span>User ID</span><input value={userId} onChange={(event) => setUserId(event.target.value)} /></label><label className="tool-field tool-field--compact"><span>User segment</span><input value={segment} onChange={(event) => setSegment(event.target.value)} /></label><div className="tag-list"><span className="tag">bucket: {bucket}</span><span className="tag">rollout: {selectedRule.rollout}%</span><span className="tag">{enabled ? "enabled" : "disabled"}</span></div></div><label className="tool-field"><span>Flag config JSON</span><textarea value={configText} readOnly spellCheck={false} /></label></div>
    </section>
  );
}
