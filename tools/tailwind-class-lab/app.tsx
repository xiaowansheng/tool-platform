"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const spacing: Record<string, string> = {
  "0": "0",
  px: "1px",
  "0.5": "0.125rem",
  "1": "0.25rem",
  "1.5": "0.375rem",
  "2": "0.5rem",
  "2.5": "0.625rem",
  "3": "0.75rem",
  "3.5": "0.875rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "8": "2rem",
  "10": "2.5rem",
  "12": "3rem",
  "16": "4rem",
  "20": "5rem",
  "24": "6rem"
};

const colors: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
  "slate-50": "#f8fafc",
  "slate-100": "#f1f5f9",
  "slate-200": "#e2e8f0",
  "slate-700": "#334155",
  "slate-800": "#1e293b",
  "slate-900": "#0f172a",
  "slate-950": "#020617",
  "zinc-900": "#18181b",
  "neutral-900": "#171717",
  "red-500": "#ef4444",
  "orange-500": "#f97316",
  "amber-400": "#fbbf24",
  "yellow-300": "#fde047",
  "green-500": "#22c55e",
  "emerald-500": "#10b981",
  "teal-500": "#14b8a6",
  "cyan-500": "#06b6d4",
  "sky-500": "#0ea5e9",
  "blue-500": "#3b82f6",
  "indigo-500": "#6366f1",
  "violet-500": "#8b5cf6",
  "purple-500": "#a855f7",
  "pink-500": "#ec4899",
  "rose-500": "#f43f5e"
};

const textSizes: Record<string, Pick<CSSProperties, "fontSize" | "lineHeight">> = {
  xs: { fontSize: "0.75rem", lineHeight: "1rem" },
  sm: { fontSize: "0.875rem", lineHeight: "1.25rem" },
  base: { fontSize: "1rem", lineHeight: "1.5rem" },
  lg: { fontSize: "1.125rem", lineHeight: "1.75rem" },
  xl: { fontSize: "1.25rem", lineHeight: "1.75rem" },
  "2xl": { fontSize: "1.5rem", lineHeight: "2rem" },
  "3xl": { fontSize: "1.875rem", lineHeight: "2.25rem" }
};

const radius: Record<string, string> = {
  none: "0",
  sm: "0.125rem",
  DEFAULT: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  full: "9999px"
};

function splitClasses(input: string) {
  return input.trim().split(/\s+/).filter(Boolean);
}

function baseClassName(className: string) {
  const parts = className.split(":");
  const base = parts[parts.length - 1] ?? className;

  return base.startsWith("!") ? base.slice(1) : base;
}

function uniqueClasses(classes: string[]) {
  return classes.filter((className, index) => classes.indexOf(className) === index);
}

function sortWeight(className: string) {
  const base = baseClassName(className);

  if (/^(static|fixed|absolute|relative|sticky|inset-|top-|right-|bottom-|left-)/.test(base)) return 10;
  if (/^(block|inline-block|inline|flex|inline-flex|grid|hidden)$/.test(base)) return 20;
  if (/^(grid-cols-|col-|row-|auto-|flex-|basis-|grow|shrink|items-|justify-|content-|place-|self-)/.test(base)) return 30;
  if (/^(m|mx|my|mt|mr|mb|ml|p|px|py|pt|pr|pb|pl|gap|space)-/.test(base)) return 40;
  if (/^(w|h|min-w|min-h|max-w|max-h)-/.test(base)) return 50;
  if (/^(font-|text-|leading-|tracking-|uppercase|lowercase|capitalize|normal-case)/.test(base)) return 60;
  if (/^(bg-|from-|via-|to-)/.test(base)) return 70;
  if (/^(border|rounded|ring|outline|divide-)/.test(base)) return 80;
  if (/^(shadow|opacity|blur|brightness|contrast|drop-shadow)/.test(base)) return 90;
  if (/^(transition|duration|ease|delay|animate|transform|scale|rotate|translate)/.test(base)) return 100;

  return 200;
}

function sortTailwindClasses(input: string) {
  return uniqueClasses(splitClasses(input))
    .map((className, index) => ({ className, index, weight: sortWeight(className) }))
    .sort((left, right) => left.weight - right.weight || left.index - right.index)
    .map((item) => item.className)
    .join(" ");
}

function spacingValue(value: string) {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1);
  }

  return spacing[value];
}

function colorValue(value: string) {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1);
  }

  return colors[value];
}

function applySpacing(style: CSSProperties, base: string) {
  const match = /^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap)-(.+)$/.exec(base);

  if (!match) {
    return;
  }

  const [, property, rawValue] = match;
  const value = spacingValue(rawValue ?? "");

  if (!value) {
    return;
  }

  if (property === "p") style.padding = value;
  if (property === "px") {
    style.paddingLeft = value;
    style.paddingRight = value;
  }
  if (property === "py") {
    style.paddingTop = value;
    style.paddingBottom = value;
  }
  if (property === "pt") style.paddingTop = value;
  if (property === "pr") style.paddingRight = value;
  if (property === "pb") style.paddingBottom = value;
  if (property === "pl") style.paddingLeft = value;
  if (property === "m") style.margin = value;
  if (property === "mx") {
    style.marginLeft = value;
    style.marginRight = value;
  }
  if (property === "my") {
    style.marginTop = value;
    style.marginBottom = value;
  }
  if (property === "mt") style.marginTop = value;
  if (property === "mr") style.marginRight = value;
  if (property === "mb") style.marginBottom = value;
  if (property === "ml") style.marginLeft = value;
  if (property === "gap") style.gap = value;
}

function previewStyleFor(input: string): CSSProperties {
  const style: CSSProperties = {
    display: "grid",
    gap: "0.75rem",
    maxWidth: "28rem",
    padding: "1.5rem",
    borderRadius: "0.75rem",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    boxShadow: "0 18px 42px rgba(2, 6, 23, 0.28)"
  };

  for (const className of splitClasses(input)) {
    const base = baseClassName(className);

    if (base === "block") style.display = "block";
    if (base === "inline-block") style.display = "inline-block";
    if (base === "flex") style.display = "flex";
    if (base === "inline-flex") style.display = "inline-flex";
    if (base === "grid") style.display = "grid";
    if (base === "flex-row") style.flexDirection = "row";
    if (base === "flex-col") style.flexDirection = "column";
    if (base === "flex-wrap") style.flexWrap = "wrap";
    if (base === "items-start") style.alignItems = "flex-start";
    if (base === "items-center") style.alignItems = "center";
    if (base === "items-end") style.alignItems = "flex-end";
    if (base === "justify-start") style.justifyContent = "flex-start";
    if (base === "justify-center") style.justifyContent = "center";
    if (base === "justify-end") style.justifyContent = "flex-end";
    if (base === "justify-between") style.justifyContent = "space-between";
    if (base.startsWith("grid-cols-")) {
      const columns = Number(base.replace("grid-cols-", ""));
      if (Number.isInteger(columns) && columns > 0) {
        style.display = "grid";
        style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
      }
    }

    applySpacing(style, base);

    if (base.startsWith("bg-")) {
      style.backgroundColor = colorValue(base.slice(3)) ?? style.backgroundColor;
    }
    if (base.startsWith("text-")) {
      const value = base.slice(5);
      const size = textSizes[value];
      const color = colorValue(value);

      if (size) {
        Object.assign(style, size);
      } else if (color) {
        style.color = color;
      }
    }
    if (base.startsWith("font-")) {
      const weight = base.slice(5);
      if (weight === "medium") style.fontWeight = 500;
      if (weight === "semibold") style.fontWeight = 600;
      if (weight === "bold") style.fontWeight = 700;
    }
    if (base.startsWith("rounded")) {
      const value = base === "rounded" ? "DEFAULT" : base.replace("rounded-", "");
      style.borderRadius = radius[value] ?? style.borderRadius;
    }
    if (base === "border") {
      style.border = "1px solid rgba(148, 163, 184, 0.35)";
    }
    if (base.startsWith("border-")) {
      style.border = `1px solid ${colorValue(base.slice(7)) ?? "rgba(148, 163, 184, 0.35)"}`;
    }
    if (base === "shadow") style.boxShadow = "0 1px 3px rgba(15, 23, 42, 0.18)";
    if (base === "shadow-lg") style.boxShadow = "0 10px 15px rgba(15, 23, 42, 0.2)";
    if (base === "shadow-xl") style.boxShadow = "0 20px 25px rgba(15, 23, 42, 0.22)";
    if (base === "w-full") style.width = "100%";
    if (base === "max-w-sm") style.maxWidth = "24rem";
    if (base === "max-w-md") style.maxWidth = "28rem";
    if (base === "max-w-lg") style.maxWidth = "32rem";
  }

  return style;
}

function conflictGroup(className: string) {
  const base = baseClassName(className);

  if (/^(block|inline-block|inline|flex|inline-flex|grid|hidden)$/.test(base)) return "display";
  if (/^flex-(row|col|row-reverse|col-reverse)$/.test(base)) return "flex direction";
  if (/^items-/.test(base)) return "align items";
  if (/^justify-/.test(base)) return "justify content";
  if (/^grid-cols-/.test(base)) return "grid columns";
  if (/^bg-/.test(base)) return "background";
  if (/^rounded/.test(base)) return "radius";
  if (/^shadow/.test(base)) return "shadow";
  if (/^text-(xs|sm|base|lg|xl|2xl|3xl)$/.test(base)) return "text size";
  if (/^text-/.test(base)) return "text color";

  return "";
}

function findConflicts(input: string) {
  const groups = new Map<string, string[]>();

  for (const className of splitClasses(input)) {
    const group = conflictGroup(className);

    if (!group) {
      continue;
    }

    groups.set(group, [...(groups.get(group) ?? []), className]);
  }

  return Array.from(groups.entries()).filter(([, values]) => values.length > 1);
}

export default function TailwindClassLabTool({ manifest }: ToolAppProps) {
  const [classes, setClasses] = useState("grid grid-cols-2 gap-4 rounded-xl bg-slate-900 p-6 text-white shadow-xl");
  const [copied, setCopied] = useState(false);
  const sorted = useMemo(() => sortTailwindClasses(classes), [classes]);
  const conflicts = useMemo(() => findConflicts(classes), [classes]);
  const previewStyle = useMemo(() => previewStyleFor(sorted), [sorted]);

  async function copySorted() {
    await navigator.clipboard.writeText(sorted);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">CSS 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Tailwind 类名</span>
          <textarea
            value={classes}
            onChange={(event) => {
              setClasses(event.target.value);
              setCopied(false);
            }}
            spellCheck={false}
          />
        </label>
        <label className="tool-field">
          <span>排序结果</span>
          <textarea value={sorted} readOnly spellCheck={false} />
        </label>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={() => void copySorted()}>{copied ? "已复制" : "复制排序结果"}</button>
      </div>

      <div className="workspace workspace--two-column">
        <article className="detail-card">
          <p className="eyebrow">预览</p>
          <div className="tailwind-preview-surface">
            <div style={previewStyle}>
              <strong>Preview card</strong>
              <span>常见 display、spacing、color、radius、shadow、typography utility 会映射为内联预览。</span>
            </div>
          </div>
        </article>
        <article className="detail-card">
          <p className="eyebrow">重复分组</p>
          {conflicts.length > 0 ? (
            <ul className="compact-list">
              {conflicts.map(([group, values]) => (
                <li key={group}><strong>{group}</strong>: {values.join(" ")}</li>
              ))}
            </ul>
          ) : (
            <p>未发现同一分组下的明显重复 utility。</p>
          )}
        </article>
      </div>

      <p className="tool-note">预览覆盖常见 Tailwind utility；复杂变体、插件 class 和任意选择器会保留在排序结果中。</p>
    </section>
  );
}
