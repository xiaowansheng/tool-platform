"use client";

import { useState, useCallback } from "react";

interface ComponentProps {
  inputText: string;
  onChangeInputText: (text: string) => void;
}

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
  if (name.startsWith("data-") || name.startsWith("aria-")) return name;
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

  let jsx = svg
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/\s([\w:-]+)="([^"]*)"/g, (_match: string, name: string, value: string) => {
      const jsxName = convertAttrName(name);
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
      if (name.startsWith("on")) {
        return ` ${toCamelCase(name)}={${value}}`;
      }
      return ` ${jsxName}="${value}"`;
    })
    .replace(/\sxlink:href="([^"]*)"/g, ' href="$1"')
    .replace(/<([\w]+)([^>]*?)\/>/g, "<$1$2 />")
    .replace(/<!--([\s\S]*?)-->/g, "{/*$1*/}")
    .trim();

  const tsProps = typescript ? ": React.SVGProps<SVGSVGElement>" : "";
  const propsDecl = addProps ? `(props${tsProps})` : "()";
  const spreadAttr = spreadProps && addProps ? " {...props}" : "";

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

export default function SvgToJsxTab({ inputText, onChangeInputText }: ComponentProps) {
  const [componentName, setComponentName] = useState("SvgIcon");
  const [typescript, setTypescript] = useState(true);
  const [addProps, setAddProps] = useState(true);
  const [memoize, setMemoize] = useState(false);
  const [spreadProps, setSpreadProps] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getJsxOutput = useCallback(() => {
    if (!inputText.trim()) return "";
    try {
      setError(null);
      return svgToJsx(inputText.trim(), {
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
  }, [inputText, componentName, typescript, addProps, memoize, spreadProps]);

  const result = getJsxOutput();

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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
        <button
          type="button"
          className="button--primary"
          onClick={handleCopy}
          disabled={!result}
        >
          {copied ? "✓ 已复制" : "复制 JSX"}
        </button>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>SVG 输入</span>
          <textarea
            value={inputText}
            onChange={(e) => onChangeInputText(e.target.value)}
            placeholder="粘贴你的 SVG 代码..."
            spellCheck={false}
            style={{ minHeight: "350px", fontFamily: "monospace" }}
          />
        </label>

        <label className="tool-field">
          <span>JSX 输出</span>
          {error ? (
            <div
              style={{
                minHeight: "350px",
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
              style={{ minHeight: "350px", fontFamily: "monospace", background: "var(--bg-muted)" }}
            />
          )}
        </label>
      </div>

      <p className="tool-note" style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
        💡 属性名自动转驼峰命名（如 <code>stroke-width</code> → <code>strokeWidth</code>），inline style 字符串自动转为对象格式。所有转换在本地浏览器完成。
      </p>
    </div>
  );
}
