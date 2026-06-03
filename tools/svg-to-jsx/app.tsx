"use client";

import { useState, useCallback } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="12" y1="8" x2="12" y2="12"/>
  <line x1="12" y1="16" x2="12.01" y2="16"/>
</svg>`;

// Attribute name mappings: HTML/SVG attr -> JSX attr
const ATTR_MAP: Record<string, string> = {
  "class": "className",
  "for": "htmlFor",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
  "stroke-opacity": "strokeOpacity",
  "fill-opacity": "fillOpacity",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
  "clip-path": "clipPath",
  "font-size": "fontSize",
  "font-weight": "fontWeight",
  "font-family": "fontFamily",
  "text-anchor": "textAnchor",
  "dominant-baseline": "dominantBaseline",
  "stop-color": "stopColor",
  "stop-opacity": "stopOpacity",
  "gradient-units": "gradientUnits",
  "gradient-transform": "gradientTransform",
  "pattern-units": "patternUnits",
  "pattern-transform": "patternTransform",
  "pointer-events": "pointerEvents",
  "shape-rendering": "shapeRendering",
  "color-interpolation": "colorInterpolation",
  "color-rendering": "colorRendering",
  "image-rendering": "imageRendering",
  "vector-effect": "vectorEffect",
  "letter-spacing": "letterSpacing",
  "word-spacing": "wordSpacing",
  "text-decoration": "textDecoration",
  "alignment-baseline": "alignmentBaseline",
  "baseline-shift": "baselineShift",
  "flood-color": "floodColor",
  "flood-opacity": "floodOpacity",
  "lighting-color": "lightingColor",
  "marker-end": "markerEnd",
  "marker-mid": "markerMid",
  "marker-start": "markerStart",
  "mask-type": "maskType",
  "overflow": "overflow",
  "tabindex": "tabIndex",
  "crossorigin": "crossOrigin",
  "xlink:href": "href",
};

function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function convertAttrName(name: string): string {
  if (ATTR_MAP[name]) return ATTR_MAP[name];
  // Handle data-* and aria-* attributes: keep as-is in JSX
  if (name.startsWith("data-") || name.startsWith("aria-")) return name;
  // camelCase everything else
  return toCamelCase(name);
}

function svgToJsx(
  svg: string,
  opts: {
    componentName: string;
    typescript: boolean;
    addProps: boolean;
    memoize: boolean;
    spreadProps: boolean;
  }
): string {
  const { componentName, typescript, addProps, memoize, spreadProps } = opts;

  // Convert attributes in the SVG string
  let jsx = svg
    // Remove XML declaration
    .replace(/<\?xml[^>]*\?>/g, "")
    // Convert self-closing tags without slash: <tag attr> -> keep
    // Convert attribute names
    .replace(/\s([\w:-]+)="([^"]*)"/g, (_match: string, name: string, value: string) => {
      const jsxName = convertAttrName(name);
      // Convert inline style strings to JSX style objects
      if (jsxName === "style") {
        const styleObj = value
          .split(";")
          .filter(Boolean)
          .map((rule: string) => {
            const [prop, val] = rule.split(":").map((s: string) => s.trim());
            if (!prop || !val) return "";
            return `${toCamelCase(prop)}: "${val}"`;
          })
          .filter(Boolean)
          .join(", ");
        return ` style={{ ${styleObj} }}`;
      }
      // Convert event handlers (onclick -> onClick)
      if (name.startsWith("on")) {
        return ` ${toCamelCase(name)}={${value}}`;
      }
      return ` ${jsxName}="${value}"`;
    })
    // Convert xlink:href without quotes handling (edge case)
    .replace(/\sxlink:href="([^"]*)"/g, ' href="$1"')
    // Self-closing tags: ensure proper format
    .replace(/<([\w]+)([^>]*?)\/>/g, "<$1$2 />")
    // Comments
    .replace(/<!--([\s\S]*?)-->/g, "{/*$1*/}")
    .trim();

  // Wrap in a React component
  const tsProps = typescript ? ": React.SVGProps<SVGSVGElement>" : "";
  const propsDecl = addProps
    ? `(props${tsProps})`
    : "()";

  const spreadAttr = spreadProps && addProps ? " {...props}" : "";

  // Insert spread into the opening SVG tag
  if (spreadAttr) {
    jsx = jsx.replace(/^<svg/, `<svg${spreadAttr}`);
  }

  const imports = memoize
    ? `import React, { memo } from "react";\n`
    : `import React from "react";\n`;

  const typeAnnotation = typescript
    ? `const ${componentName}: React.FC<React.SVGProps<SVGSVGElement>> = `
    : `const ${componentName} = `;

  const component = `${imports}\n${typeAnnotation}${propsDecl} => (\n  ${jsx
    .split("\n")
    .join("\n  ")}\n);\n\nexport default ${memoize ? `memo(${componentName})` : componentName};\n`;

  return component;
}

type CopyState = "idle" | "copied";

export default function SvgToJsxTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(SAMPLE_SVG);
  const [componentName, setComponentName] = useState("SvgIcon");
  const [typescript, setTypescript] = useState(true);
  const [addProps, setAddProps] = useState(true);
  const [memoize, setMemoize] = useState(false);
  const [spreadProps, setSpreadProps] = useState(true);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [error, setError] = useState<string | null>(null);

  const output = useCallback(() => {
    if (!input.trim()) return "";
    try {
      setError(null);
      return svgToJsx(input.trim(), {
        componentName: componentName || "SvgIcon",
        typescript,
        addProps,
        memoize,
        spreadProps,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return "";
    }
  }, [input, componentName, typescript, addProps, memoize, spreadProps]);

  const result = output();

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    });
  };

  const handleClear = () => {
    setInput("");
    setError(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch {
      console.warn("Clipboard read failed");
    }
  };

  const lineCount = (s: string) => s.split("\n").length;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">SVG 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Options Row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          background: "var(--bg-muted)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "1rem 1.25rem",
          alignItems: "center",
        }}
      >
        <div className="tool-field" style={{ gap: "0.25rem", flex: "1 1 180px", minWidth: 0 }}>
          <span style={{ fontSize: "0.8rem" }}>组件名称</span>
          <input
            type="text"
            value={componentName}
            onChange={(e) => setComponentName(e.target.value)}
            placeholder="SvgIcon"
            style={{ background: "var(--bg-base)", width: "100%" }}
          />
        </div>

        {[
          { label: "TypeScript", value: typescript, set: setTypescript },
          { label: "接收 Props", value: addProps, set: setAddProps },
          { label: "展开 Props", value: spreadProps, set: setSpreadProps },
          { label: "memo 包裹", value: memoize, set: setMemoize },
        ].map(({ label, value, set }) => (
          <label
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.85rem",
              cursor: "pointer",
              color: "var(--text-primary)",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => set(e.target.checked)}
              style={{ width: 15, height: 15, cursor: "pointer" }}
            />
            {label}
          </label>
        ))}
      </div>

      {/* Main Editor Area */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.25rem",
          marginTop: "0.25rem",
        }}
      >
        {/* Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              SVG 输入 · {lineCount(input)} 行
            </span>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                type="button"
                className="button--secondary"
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}
                onClick={handlePaste}
              >
                粘贴
              </button>
              <button
                type="button"
                className="button--secondary"
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}
                onClick={() => setInput(SAMPLE_SVG)}
              >
                示例
              </button>
              <button
                type="button"
                className="button--danger"
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}
                onClick={handleClear}
              >
                清空
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴你的 SVG 代码..."
            spellCheck={false}
            style={{
              fontFamily: "monospace",
              fontSize: "0.82rem",
              width: "100%",
              minHeight: "420px",
              resize: "vertical",
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.85rem",
              color: "var(--text-primary)",
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* Output */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              JSX 输出 · {result ? lineCount(result) : 0} 行
            </span>
            <button
              type="button"
              className={copyState === "copied" ? "button--secondary" : "button--primary"}
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}
              onClick={handleCopy}
              disabled={!result}
            >
              {copyState === "copied" ? "✓ 已复制" : "复制代码"}
            </button>
          </div>

          {error ? (
            <div
              style={{
                minHeight: "420px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "8px",
                padding: "1rem",
                color: "#ef4444",
                fontSize: "0.82rem",
                fontFamily: "monospace",
              }}
            >
              ⚠ 转换错误：{error}
            </div>
          ) : (
            <textarea
              value={result}
              readOnly
              spellCheck={false}
              placeholder="转换结果将显示在这里..."
              style={{
                fontFamily: "monospace",
                fontSize: "0.82rem",
                width: "100%",
                minHeight: "420px",
                resize: "vertical",
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.85rem",
                color: "var(--text-primary)",
                lineHeight: 1.6,
              }}
            />
          )}
        </div>
      </div>

      <div className="tool-note" style={{ marginTop: "1rem" }}>
        💡 <b>说明：</b>本工具将 SVG 代码转为可直接使用的 React 组件。属性名自动转驼峰命名（如{" "}
        <code>stroke-width</code> → <code>strokeWidth</code>），inline style 字符串自动转为对象格式。所有转换在本地浏览器完成，无需上传代码。
      </div>
    </section>
  );
}
