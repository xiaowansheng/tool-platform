"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface Specificity {
  ids: number;
  classes: number;
  types: number;
}

interface SelectorResult extends Specificity {
  selector: string;
  score: string;
}

function add(left: Specificity, right: Specificity): Specificity {
  return {
    ids: left.ids + right.ids,
    classes: left.classes + right.classes,
    types: left.types + right.types
  };
}

function compare(left: Specificity, right: Specificity) {
  return left.ids - right.ids || left.classes - right.classes || left.types - right.types;
}

function maxSpecificity(items: Specificity[]) {
  return items.reduce<Specificity>((best, item) => compare(item, best) > 0 ? item : best, { ids: 0, classes: 0, types: 0 });
}

function splitSelectorList(input: string) {
  const selectors: string[] = [];
  let depth = 0;
  let current = "";

  for (const character of input) {
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);

    if (character === "," && depth === 0) {
      selectors.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  if (current.trim()) {
    selectors.push(current.trim());
  }

  return selectors;
}

function replaceFunctionalPseudo(
  selector: string,
  name: string,
  replacement: (content: string) => string
) {
  let output = "";
  let index = 0;
  const token = `:${name}(`;

  while (index < selector.length) {
    const start = selector.indexOf(token, index);

    if (start === -1) {
      output += selector.slice(index);
      break;
    }

    output += selector.slice(index, start);
    let depth = 1;
    let cursor = start + token.length;

    while (cursor < selector.length && depth > 0) {
      const character = selector[cursor];

      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
      cursor += 1;
    }

    output += replacement(selector.slice(start + token.length, cursor - 1));
    index = cursor;
  }

  return output;
}

function calculateSingleSelector(input: string): Specificity {
  let selector = input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/["'][^"']*["']/g, " ");
  let extra: Specificity = { ids: 0, classes: 0, types: 0 };

  selector = replaceFunctionalPseudo(selector, "where", () => " ");

  for (const pseudo of ["is", "not", "has"]) {
    selector = replaceFunctionalPseudo(selector, pseudo, (content) => {
      extra = add(extra, maxSpecificity(splitSelectorList(content).map(calculateSingleSelector)));

      return " ";
    });
  }

  selector = selector.replace(/:(nth-child|nth-last-child)\(([^)]*?)\bof\b([^)]*)\)/g, (_match, _name, _prefix, content: string) => {
    extra = add(extra, { ids: 0, classes: 1, types: 0 });
    extra = add(extra, maxSpecificity(splitSelectorList(content).map(calculateSingleSelector)));

    return " ";
  });

  const ids = (selector.match(/#[\w-]+/g) ?? []).length;
  const attributes = (selector.match(/\[[^\]]+\]/g) ?? []).length;
  const classes = (selector.match(/\.[\w-]+/g) ?? []).length;
  const pseudoElements = (selector.match(/::[\w-]+|:(before|after|first-line|first-letter)\b/g) ?? []).length;
  const pseudoClasses = (selector.match(/:(?!:)[\w-]+(?:\([^)]*\))?/g) ?? []).length - pseudoElements;
  const withoutMarked = selector
    .replace(/#[\w-]+/g, " ")
    .replace(/\.[\w-]+/g, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/::[\w-]+|:(before|after|first-line|first-letter)\b/g, " ")
    .replace(/:(?!:)[\w-]+(?:\([^)]*\))?/g, " ")
    .replace(/[>+~]/g, " ");
  const typeMatches = withoutMarked.match(/(^|[\s,(])([a-zA-Z][\w-]*|\*)/g) ?? [];
  const types = typeMatches.filter((match) => !match.trim().startsWith("*")).length + pseudoElements;

  return add(extra, {
    ids,
    classes: classes + attributes + Math.max(0, pseudoClasses),
    types
  });
}

function calculateSelectors(input: string): SelectorResult[] {
  return input
    .split(/\r?\n/)
    .map((selector) => selector.trim())
    .filter(Boolean)
    .flatMap(splitSelectorList)
    .map((selector) => {
      const specificity = calculateSingleSelector(selector);

      return {
        selector,
        ...specificity,
        score: `${specificity.ids}-${specificity.classes}-${specificity.types}`
      };
    })
    .sort((left, right) => compare(right, left));
}

export default function CssSpecificityCalculatorTool({ manifest }: ToolClientProps) {
  const [input, setInput] = useState([
    ".card:hover > h2",
    "#app .sidebar nav a.active",
    ":where(article) :is(h1, .title)",
    "button[data-state=\"open\"]::before"
  ].join("\n"));
  const results = useMemo(() => calculateSelectors(input), [input]);
  const top = results[0];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">CSS 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <label className="tool-field">
        <span>选择器，每行一个；逗号分隔会自动拆分</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>最高权重</h3>
          <p className="mono-output">{top ? top.score : "0-0-0"}</p>
        </article>
        <article className="detail-card">
          <h3>ID</h3>
          <p>{top?.ids ?? 0}</p>
        </article>
        <article className="detail-card">
          <h3>类 / 属性 / 伪类</h3>
          <p>{top?.classes ?? 0}</p>
        </article>
        <article className="detail-card">
          <h3>类型 / 伪元素</h3>
          <p>{top?.types ?? 0}</p>
        </article>
      </div>

      <div className="specificity-table">
        <div className="specificity-table__row specificity-table__row--head">
          <span>选择器</span>
          <span>ID</span>
          <span>类</span>
          <span>类型</span>
          <span>分数</span>
        </div>
        {results.map((result) => (
          <div key={result.selector} className="specificity-table__row">
            <code>{result.selector}</code>
            <span>{result.ids}</span>
            <span>{result.classes}</span>
            <span>{result.types}</span>
            <strong>{result.score}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
