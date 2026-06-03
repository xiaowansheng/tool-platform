"use client";

import { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface DiffLine {
  type: "added" | "removed" | "unchanged" | "empty";
  content: string;
  num?: number;
}

function sortJsonKeys(val: any): any {
  if (Array.isArray(val)) {
    return val.map(sortJsonKeys);
  } else if (val !== null && typeof val === "object") {
    const keys = Object.keys(val).sort();
    const sortedObj: any = {};
    for (const key of keys) {
      sortedObj[key] = sortJsonKeys(val[key]);
    }
    return sortedObj;
  }
  return val;
}

// LCS-based side-by-side alignment
function diffLines(left: string[], right: string[]): { leftLines: DiffLine[]; rightLines: DiffLine[] } {
  const M = left.length;
  const N = right.length;
  const dp: number[][] = Array.from({ length: M + 1 }, () => Array(N + 1).fill(0));

  for (let i = 1; i <= M; i++) {
    for (let j = 1; j <= N; j++) {
      if (left[i - 1] === right[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const leftLines: DiffLine[] = [];
  const rightLines: DiffLine[] = [];

  let i = M;
  let j = N;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) {
      leftLines.unshift({ type: "unchanged", content: left[i - 1], num: i });
      rightLines.unshift({ type: "unchanged", content: right[j - 1], num: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      leftLines.unshift({ type: "empty", content: "" });
      rightLines.unshift({ type: "added", content: right[j - 1], num: j });
      j--;
    } else {
      leftLines.unshift({ type: "removed", content: left[i - 1], num: i });
      rightLines.unshift({ type: "empty", content: "" });
      i--;
    }
  }

  return { leftLines, rightLines };
}

const SAMPLE_LEFT = `{
  "name": "Antigravity",
  "version": "1.0.0",
  "description": "AI Coding Assistant",
  "features": [
    "code generation",
    "bug fixing",
    "refactoring"
  ],
  "settings": {
    "theme": "dark",
    "fontSize": 14,
    "enableTelemetry": true
  }
}`;

const SAMPLE_RIGHT = `{
  "name": "Antigravity Premium",
  "version": "1.1.0",
  "features": [
    "code generation",
    "interactive playground",
    "bug fixing",
    "refactoring"
  ],
  "settings": {
    "fontSize": 16,
    "theme": "glass",
    "enableTelemetry": false
  },
  "author": "Google DeepMind"
}`;

export default function JsonDiffTool({ manifest }: ToolAppProps) {
  const [leftInput, setLeftInput] = useState(SAMPLE_LEFT);
  const [rightInput, setRightInput] = useState(SAMPLE_RIGHT);
  const [ignoreKeyOrder, setIgnoreKeyOrder] = useState(true);

  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);

  // Compute diff results
  const diffResult = useMemo(() => {
    setLeftError(null);
    setRightError(null);

    let leftObj: any = null;
    let rightObj: any = null;

    if (leftInput.trim()) {
      try {
        leftObj = JSON.parse(leftInput);
      } catch (err: any) {
        setLeftError(`左侧 JSON 语法错误: ${err.message}`);
        return null;
      }
    }

    if (rightInput.trim()) {
      try {
        rightObj = JSON.parse(rightInput);
      } catch (err: any) {
        setRightError(`右侧 JSON 语法错误: ${err.message}`);
        return null;
      }
    }

    if (!leftObj && !rightObj) return null;

    let finalLeftObj = leftObj ?? {};
    let finalRightObj = rightObj ?? {};

    if (ignoreKeyOrder) {
      finalLeftObj = sortJsonKeys(finalLeftObj);
      finalRightObj = sortJsonKeys(finalRightObj);
    }

    const leftFormatted = JSON.stringify(finalLeftObj, null, 2);
    const rightFormatted = JSON.stringify(finalRightObj, null, 2);

    const leftLinesArr = leftFormatted.split("\n");
    const rightLinesArr = rightFormatted.split("\n");

    const { leftLines, rightLines } = diffLines(leftLinesArr, rightLinesArr);

    let additions = 0;
    let deletions = 0;
    let modified = 0;

    for (let index = 0; index < leftLines.length; index++) {
      if (leftLines[index].type === "removed" && rightLines[index].type === "added") {
        modified++;
      } else if (leftLines[index].type === "removed") {
        deletions++;
      } else if (rightLines[index].type === "added") {
        additions++;
      }
    }

    return {
      leftLines,
      rightLines,
      stats: { additions, deletions, modified, totalDiffs: additions + deletions + modified }
    };
  }, [leftInput, rightInput, ignoreKeyOrder]);

  const handleBeautify = (side: "left" | "right") => {
    const input = side === "left" ? leftInput : rightInput;
    if (!input.trim()) return;
    try {
      const obj = JSON.parse(input);
      const formatted = JSON.stringify(obj, null, 2);
      if (side === "left") {
        setLeftInput(formatted);
        setLeftError(null);
      } else {
        setRightInput(formatted);
        setRightError(null);
      }
    } catch (err: any) {
      if (side === "left") setLeftError(`左侧 JSON 格式化失败: ${err.message}`);
      else setRightError(`右侧 JSON 格式化失败: ${err.message}`);
    }
  };

  const handleMinify = (side: "left" | "right") => {
    const input = side === "left" ? leftInput : rightInput;
    if (!input.trim()) return;
    try {
      const obj = JSON.parse(input);
      const minified = JSON.stringify(obj);
      if (side === "left") {
        setLeftInput(minified);
        setLeftError(null);
      } else {
        setRightInput(minified);
        setRightError(null);
      }
    } catch (err: any) {
      if (side === "left") setLeftError(`左侧 JSON 压缩失败: ${err.message}`);
      else setRightError(`右侧 JSON 压缩失败: ${err.message}`);
    }
  };

  const handleClear = () => {
    setLeftInput("");
    setRightInput("");
    setLeftError(null);
    setRightError(null);
  };

  const handleLoadSample = () => {
    setLeftInput(SAMPLE_LEFT);
    setRightInput(SAMPLE_RIGHT);
    setLeftError(null);
    setRightError(null);
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数据工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Editor Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontWeight: 600 }}>原始 JSON (左侧)</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" onClick={() => handleBeautify("left")} style={{ padding: "4px 8px", fontSize: "12px", border: "1px solid #ccc", borderRadius: "4px", background: "#f5f5f7", cursor: "pointer" }}>格式化</button>
              <button type="button" onClick={() => handleMinify("left")} style={{ padding: "4px 8px", fontSize: "12px", border: "1px solid #ccc", borderRadius: "4px", background: "#f5f5f7", cursor: "pointer" }}>压缩</button>
            </div>
          </div>
          <textarea
            value={leftInput}
            onChange={(e) => setLeftInput(e.target.value)}
            rows={12}
            style={{ width: "100%", fontFamily: "monospace", padding: "10px", fontSize: "13px", border: leftError ? "1px solid #ef4444" : "1px solid #ccc", borderRadius: "6px", resize: "vertical" }}
            placeholder="在此粘贴源 JSON..."
          />
          {leftError && <p style={{ color: "#ef4444", fontSize: "12px", margin: "4px 0 0 0" }}>{leftError}</p>}
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontWeight: 600 }}>对比 JSON (右侧)</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" onClick={() => handleBeautify("right")} style={{ padding: "4px 8px", fontSize: "12px", border: "1px solid #ccc", borderRadius: "4px", background: "#f5f5f7", cursor: "pointer" }}>格式化</button>
              <button type="button" onClick={() => handleMinify("right")} style={{ padding: "4px 8px", fontSize: "12px", border: "1px solid #ccc", borderRadius: "4px", background: "#f5f5f7", cursor: "pointer" }}>压缩</button>
            </div>
          </div>
          <textarea
            value={rightInput}
            onChange={(e) => setRightInput(e.target.value)}
            rows={12}
            style={{ width: "100%", fontFamily: "monospace", padding: "10px", fontSize: "13px", border: rightError ? "1px solid #ef4444" : "1px solid #ccc", borderRadius: "6px", resize: "vertical" }}
            placeholder="在此粘贴对比 JSON..."
          />
          {rightError && <p style={{ color: "#ef4444", fontSize: "12px", margin: "4px 0 0 0" }}>{rightError}</p>}
        </div>
      </div>

      {/* Control bar */}
      <div className="tool-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderRadius: "6px", backgroundColor: "#f9f9fb", marginBottom: "16px", border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={ignoreKeyOrder}
              onChange={(e) => setIgnoreKeyOrder(e.target.checked)}
            />
            <span>忽略对象属性(键)的顺序差异</span>
          </label>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button type="button" onClick={handleClear} style={{ padding: "6px 12px", border: "1px solid #ccc", borderRadius: "4px", background: "#fff", cursor: "pointer" }}>清空输入</button>
          <button type="button" onClick={handleLoadSample} style={{ padding: "6px 12px", border: "1px solid #4f46e5", color: "#fff", borderRadius: "4px", background: "#4f46e5", cursor: "pointer", fontWeight: "600" }}>加载示例数据</button>
        </div>
      </div>

      {/* Diff Result Summary */}
      {diffResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: diffResult.stats.totalDiffs === 0 ? "#ecfdf5" : "#fffbeb", border: "1px solid", borderColor: diffResult.stats.totalDiffs === 0 ? "#a7f3d0" : "#fde68a", borderRadius: "6px" }}>
            <span style={{ fontWeight: 600, color: diffResult.stats.totalDiffs === 0 ? "#065f46" : "#92400e" }}>
              {diffResult.stats.totalDiffs === 0 ? "🎉 两侧 JSON 完全一致！" : "⚠️ 检测到两份 JSON 存在差异："}
            </span>
            {diffResult.stats.totalDiffs > 0 && (
              <div style={{ display: "flex", gap: "16px", fontSize: "14px" }}>
                <span style={{ color: "#b91c1c" }}>❌ 减少: {diffResult.stats.deletions} 行</span>
                <span style={{ color: "#15803d" }}>➕ 增加: {diffResult.stats.additions} 行</span>
                <span style={{ color: "#b45309" }}>🔄 修改: {diffResult.stats.modified} 行</span>
              </div>
            )}
          </div>

          {/* Side by Side Diff Viewer */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.5" }}>
            {/* Left side diff */}
            <div style={{ backgroundColor: "#fefefe", borderRight: "1px solid #e5e7eb", overflowX: "auto" }}>
              <div style={{ padding: "6px 12px", backgroundColor: "#f3f4f6", borderBottom: "1px solid #e5e7eb", fontWeight: 600, fontSize: "12px", color: "#4b5563" }}>ORIGINAL (LEFT)</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {diffResult.leftLines.map((line, idx) => {
                    const isRemoved = line.type === "removed";
                    const isEmpty = line.type === "empty";
                    const bgColor = isRemoved ? "#fee2e2" : isEmpty ? "#fafafa" : "transparent";
                    const textColor = isRemoved ? "#991b1b" : "#111827";
                    return (
                      <tr key={idx} style={{ backgroundColor: bgColor, color: textColor, minHeight: "20px" }}>
                        <td style={{ width: "36px", padding: "0 8px", color: "#9ca3af", borderRight: "1px solid #e5e7eb", textAlign: "right", userSelect: "none", backgroundColor: "#f9fafb" }}>
                          {line.num}
                        </td>
                        <td style={{ width: "24px", padding: "0 4px", color: "#ef4444", textAlign: "center", userSelect: "none" }}>
                          {isRemoved ? "-" : ""}
                        </td>
                        <td style={{ padding: "0 8px", whiteSpace: "pre", wordBreak: "break-all" }}>
                          {line.content}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Right side diff */}
            <div style={{ backgroundColor: "#fefefe", overflowX: "auto" }}>
              <div style={{ padding: "6px 12px", backgroundColor: "#f3f4f6", borderBottom: "1px solid #e5e7eb", fontWeight: 600, fontSize: "12px", color: "#4b5563" }}>MODIFIED (RIGHT)</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {diffResult.rightLines.map((line, idx) => {
                    const isAdded = line.type === "added";
                    const isEmpty = line.type === "empty";
                    const bgColor = isAdded ? "#dcfce7" : isEmpty ? "#fafafa" : "transparent";
                    const textColor = isAdded ? "#166534" : "#111827";
                    return (
                      <tr key={idx} style={{ backgroundColor: bgColor, color: textColor, minHeight: "20px" }}>
                        <td style={{ width: "36px", padding: "0 8px", color: "#9ca3af", borderRight: "1px solid #e5e7eb", textAlign: "right", userSelect: "none", backgroundColor: "#f9fafb" }}>
                          {line.num}
                        </td>
                        <td style={{ width: "24px", padding: "0 4px", color: "#22c55e", textAlign: "center", userSelect: "none" }}>
                          {isAdded ? "+" : ""}
                        </td>
                        <td style={{ padding: "0 8px", whiteSpace: "pre", wordBreak: "break-all" }}>
                          {line.content}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!diffResult && !leftInput && !rightInput && (
        <div style={{ padding: "40px 0", textAlign: "center", border: "2px dashed #e5e7eb", borderRadius: "8px", color: "#9ca3af" }}>
          请输入两份待对比的 JSON 数据，或者点击“加载示例数据”按钮体验。
        </div>
      )}
    </section>
  );
}
