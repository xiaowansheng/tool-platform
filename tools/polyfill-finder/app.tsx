"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface PolyfillRule {
  pattern: RegExp;
  api: string;
  suggestion: string;
  risk: string;
}

const rules: PolyfillRule[] = [
  { pattern: /\bPromise\.allSettled\b/g, api: "Promise.allSettled", suggestion: "core-js/features/promise/all-settled", risk: "Older Safari and legacy Chromium may need a polyfill." },
  { pattern: /\bArray\.prototype\.flat\b|\.flat\(/g, api: "Array.flat", suggestion: "core-js/features/array/flat", risk: "Not available in IE and older embedded browsers." },
  { pattern: /\bObject\.fromEntries\b/g, api: "Object.fromEntries", suggestion: "core-js/features/object/from-entries", risk: "Requires polyfill in IE and older mobile WebViews." },
  { pattern: /\bstructuredClone\b/g, api: "structuredClone", suggestion: "Use a ponyfill or fallback to MessageChannel/JSON for simple data.", risk: "Not present in older Node/browser runtimes." },
  { pattern: /\bIntersectionObserver\b/g, api: "IntersectionObserver", suggestion: "intersection-observer polyfill", risk: "May be missing in old Safari and legacy browsers." },
  { pattern: /\bResizeObserver\b/g, api: "ResizeObserver", suggestion: "@juggle/resize-observer", risk: "Older browsers need a ponyfill." },
  { pattern: /\bfetch\(/g, api: "fetch", suggestion: "whatwg-fetch or unfetch", risk: "Legacy browsers and some test runtimes need a fetch implementation." }
];

const sampleCode = [
  "const rows = await fetch('/api/items').then(r => r.json());",
  "const visible = rows.flat().filter(Boolean);",
  "const snapshot = structuredClone(Object.fromEntries(visible));"
].join("\n");

export default function PolyfillFinderTool({ manifest }: ToolAppProps) {
  const [code, setCode] = useState(sampleCode);
  const findings = useMemo(() => rules.filter((rule) => { rule.pattern.lastIndex = 0; return rule.pattern.test(code); }), [code]);
  const installHint = useMemo(() => findings.map((finding) => finding.suggestion).filter((value) => value.includes("/") || value.includes("@")), [findings]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Compatibility</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar"><button type="button" onClick={() => setCode(sampleCode)}>Load sample</button></div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>JS / TS code</span><textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} /></label><div className="detail-card"><h3>Install hints</h3><div className="tag-list">{installHint.length ? installHint.map((hint) => <span className="tag" key={hint}>{hint}</span>) : <span className="tag">No polyfills detected</span>}</div></div></div>
      <div className="detail-grid">{findings.map((finding) => <article className="detail-card" key={finding.api}><h3>{finding.api}</h3><p>{finding.risk}</p><p className="mono-output">{finding.suggestion}</p></article>)}</div>
    </section>
  );
}
