"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ParsedRule {
  id: string;
  message: string;
  severity: string;
  languages: string[];
  patterns: string[];
}

interface RuleMatch {
  pattern: string;
  line: number;
  excerpt: string;
}

const sampleRule = `rules:
  - id: dangerous-eval
    message: Avoid eval on user-controlled input
    severity: ERROR
    languages: [javascript, typescript]
    pattern: eval($EXPR)`;

const sampleCode = `export function runExpression(input) {
  return eval(input);
}

const safe = JSON.parse(payload);`;

function readScalar(input: string, key: string) {
  const match = input.match(new RegExp(`(?:^|\\n)\\s*${key}:\\s*["']?([^"'\\n]+)["']?`));
  return match?.[1]?.trim() ?? "";
}

function readLanguages(input: string) {
  const inline = input.match(/languages:\s*\[([^\]]+)\]/);
  if (inline?.[1]) {
    return inline[1].split(",").map((item) => item.trim()).filter(Boolean);
  }

  const block = input.match(/languages:\s*\n((?:\s*-\s*[^\n]+\n?)+)/);
  if (!block?.[1]) return [];

  return block[1].split(/\r?\n/)
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function readPatterns(input: string) {
  const patterns = Array.from(input.matchAll(/(?:^|\n)\s*(?:-\s*)?pattern:\s*(.+)/g))
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);

  return patterns.length ? patterns : [];
}

function parseRule(input: string): ParsedRule {
  const patterns = readPatterns(input);

  if (patterns.length === 0) {
    throw new Error("没有找到 pattern 字段");
  }

  return {
    id: readScalar(input, "id") || "unnamed-rule",
    message: readScalar(input, "message") || "No message",
    severity: readScalar(input, "severity") || "INFO",
    languages: readLanguages(input),
    patterns
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternToRegex(pattern: string) {
  const escaped = escapeRegex(pattern)
    .replace(/\\\$[A-Z_][A-Z0-9_]*/g, "[\\s\\S]+?")
    .replace(/\s+/g, "\\s+");

  return new RegExp(escaped, "g");
}

function findMatches(rule: ParsedRule, code: string): RuleMatch[] {
  return rule.patterns.flatMap((pattern) => {
    const regex = patternToRegex(pattern);
    const matches: RuleMatch[] = [];

    for (const match of code.matchAll(regex)) {
      const index = match.index ?? 0;
      const line = code.slice(0, index).split(/\r?\n/).length;
      const excerpt = match[0].split(/\r?\n/).slice(0, 4).join("\n");

      matches.push({ pattern, line, excerpt });
    }

    return matches;
  });
}

export default function SemgrepRulePlaygroundTool({ manifest }: ToolAppProps) {
  const [ruleText, setRuleText] = useState(sampleRule);
  const [code, setCode] = useState(sampleCode);

  const result = useMemo(() => {
    try {
      const rule = parseRule(ruleText);
      return { rule, matches: findMatches(rule, code), error: "" };
    } catch (error) {
      return {
        rule: null,
        matches: [],
        error: error instanceof Error ? error.message : "规则解析失败"
      };
    }
  }, [code, ruleText]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">静态分析</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>规则 YAML</span>
          <textarea value={ruleText} onChange={(event) => setRuleText(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>示例代码</span>
          <textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} />
        </label>
      </div>

      {result.rule ? (
        <>
          <div className="detail-grid">
            <article className="detail-card">
              <h3>规则</h3>
              <p>{result.rule.id}</p>
            </article>
            <article className="detail-card">
              <h3>严重级别</h3>
              <p>{result.rule.severity}</p>
            </article>
            <article className="detail-card">
              <h3>语言</h3>
              <p>{result.rule.languages.join(", ") || "未指定"}</p>
            </article>
            <article className="detail-card">
              <h3>匹配数</h3>
              <p>{result.matches.length}</p>
            </article>
          </div>

          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head">
              <span>行号</span>
              <span>匹配</span>
            </div>
            {result.matches.length > 0 ? result.matches.map((match, index) => (
              <div key={`${match.pattern}-${match.line}-${index}`} className="tool-table__row">
                <span>{match.line}</span>
                <span>
                  <span className="mono-output">{match.pattern}</span><br />
                  <code className="mono-output">{match.excerpt}</code>
                </span>
              </div>
            )) : (
              <div className="tool-table__row">
                <span>无匹配</span>
                <span>{result.rule.message}</span>
              </div>
            )}
          </div>
          <p className="tool-note">这里使用轻量本地模式匹配预览规则，不等同 Semgrep CLI 的完整 AST 引擎。</p>
        </>
      ) : (
        <p className="tool-error">{result.error}</p>
      )}
    </section>
  );
}
