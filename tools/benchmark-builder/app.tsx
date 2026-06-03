"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface BenchmarkCase {
  id: number;
  name: string;
  code: string;
  results: { avg: number; min: number; max: number; runs: number } | null;
}

const defaultCases: BenchmarkCase[] = [
  {
    id: 1,
    name: "for 循环",
    code: "let sum = 0;\nfor (let i = 0; i < 1000; i++) {\n  sum += i;\n}",
    results: null
  },
  {
    id: 2,
    name: "Array.reduce",
    code: "const arr = Array.from({ length: 1000 }, (_, i) => i);\nconst sum = arr.reduce((a, b) => a + b, 0);",
    results: null
  }
];

async function runBenchmark(code: string, iterations: number, warmup: number): Promise<{ avg: number; min: number; max: number; runs: number }> {
  // Warmup
  const fn = new Function(code);
  for (let i = 0; i < warmup; i++) fn();

  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  times.sort((a, b) => a - b);
  // Remove outliers (top/bottom 5%)
  const trimCount = Math.max(1, Math.floor(times.length * 0.05));
  const trimmed = times.slice(trimCount, -trimCount);

  const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  return {
    avg: Math.round(avg * 1000) / 1000,
    min: Math.round(trimmed[0]! * 1000) / 1000,
    max: Math.round(trimmed[trimmed.length - 1]! * 1000) / 1000,
    runs: trimmed.length
  };
}

function formatMs(ms: number): string {
  if (ms < 0.01) return `${(ms * 1000).toFixed(2)} μs`;
  if (ms < 1) return `${(ms * 1000).toFixed(1)} μs`;
  return `${ms.toFixed(3)} ms`;
}

export default function BenchmarkBuilderTool({ manifest }: ToolAppProps) {
  const [cases, setCases] = useState<BenchmarkCase[]>(defaultCases);
  const [iterations, setIterations] = useState(1000);
  const [warmup, setWarmup] = useState(10);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  function addCase() {
    setCases([...cases, { id: Date.now(), name: `测试 ${cases.length + 1}`, code: "// 输入 JavaScript 代码", results: null }]);
  }

  function removeCase(id: number) {
    if (cases.length <= 1) return;
    setCases(cases.filter((c) => c.id !== id));
  }

  function updateCase(id: number, field: "name" | "code", value: string) {
    setCases(cases.map((c) => c.id === id ? { ...c, [field]: value, results: null } : c));
  }

  async function handleRun() {
    setRunning(true);
    setError("");

    try {
      const results: BenchmarkCase[] = [];
      for (const testCase of cases) {
        try {
          const result = await runBenchmark(testCase.code, iterations, warmup);
          results.push({ ...testCase, results: result });
        } catch (e) {
          setError(`${testCase.name}: ${e instanceof Error ? e.message : "执行出错"}`);
          results.push({ ...testCase, results: null });
        }
      }
      setCases(results);
    } finally {
      setRunning(false);
    }
  }

  const bestCase = cases.filter((c) => c.results).sort((a, b) => a.results!.avg - b.results!.avg)[0];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">性能测试</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>迭代次数</span>
          <input
            type="number"
            min={10}
            max={100000}
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>预热次数</span>
          <input
            type="number"
            min={0}
            max={1000}
            value={warmup}
            onChange={(e) => setWarmup(Number(e.target.value))}
          />
        </label>
        <button type="button" className="button--primary" onClick={() => void handleRun()} disabled={running}>
          {running ? "运行中..." : "运行基准测试"}
        </button>
        <button type="button" onClick={addCase}>
          + 添加测试
        </button>
      </div>

      {cases.map((testCase, index) => (
        <div key={testCase.id} style={{ marginBottom: "16px", padding: "12px", border: "1px solid var(--border, #333)", borderRadius: "8px" }}>
          <div className="tool-toolbar" style={{ marginBottom: "8px" }}>
            <input
              type="text"
              value={testCase.name}
              onChange={(e) => updateCase(testCase.id, "name", e.target.value)}
              style={{ fontWeight: "bold", flex: 1 }}
              placeholder="测试名称"
            />
            {cases.length > 1 ? (
              <button type="button" onClick={() => removeCase(testCase.id)} style={{ fontSize: "0.85em" }}>
                删除
              </button>
            ) : null}
          </div>
          <label className="tool-field">
            <span>JavaScript 代码</span>
            <textarea
              value={testCase.code}
              onChange={(e) => updateCase(testCase.id, "code", e.target.value)}
              spellCheck={false}
              rows={4}
              style={{ fontFamily: "monospace", fontSize: "0.9em" }}
            />
          </label>
          {testCase.results ? (
            <div className="detail-grid" style={{ marginTop: "8px" }}>
              <article className="detail-card">
                <h3>平均</h3>
                <p style={{ color: bestCase?.id === testCase.id ? "#22c55e" : undefined }}>
                  {formatMs(testCase.results.avg)}
                  {bestCase?.id === testCase.id ? " (最快)" : ""}
                </p>
              </article>
              <article className="detail-card">
                <h3>最小</h3>
                <p>{formatMs(testCase.results.min)}</p>
              </article>
              <article className="detail-card">
                <h3>最大</h3>
                <p>{formatMs(testCase.results.max)}</p>
              </article>
              <article className="detail-card">
                <h3>有效运行</h3>
                <p>{testCase.results.runs}</p>
              </article>
            </div>
          ) : null}
        </div>
      ))}

      {bestCase && cases.filter((c) => c.results).length > 1 ? (
        <label className="tool-field">
          <span>对比结果</span>
          <div style={{ padding: "8px 0" }}>
            {cases
              .filter((c) => c.results)
              .sort((a, b) => a.results!.avg - b.results!.avg)
              .map((c, i) => (
                <div key={c.id} style={{ padding: "4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: "bold", width: "20px" }}>#{i + 1}</span>
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ fontFamily: "monospace" }}>{formatMs(c.results!.avg)}</span>
                  {i > 0 ? (
                    <span style={{ fontSize: "0.85em", opacity: 0.7 }}>
                      ({(c.results!.avg / cases.filter((c2) => c2.results).sort((a, b) => a.results!.avg - b.results!.avg)[0]!.results!.avg).toFixed(2)}x)
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.85em", color: "#22c55e" }}>基准</span>
                  )}
                </div>
              ))}
          </div>
        </label>
      ) : null}

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">
        基准测试结果受浏览器环境、JIT 优化等因素影响，仅供参考。已自动去除 5% 的极端值以提高准确性。
      </p>
    </section>
  );
}
