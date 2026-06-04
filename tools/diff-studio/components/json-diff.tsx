"use client";

import { useState, useMemo, useEffect } from "react";

interface DiffLine {
  type: "added" | "removed" | "unchanged" | "empty";
  content: string;
  num?: number;
}

interface ComponentProps {
  leftText: string;
  onChangeLeftText: (text: string) => void;
  rightText: string;
  onChangeRightText: (text: string) => void;
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

export default function JsonDiffTab({ leftText, onChangeLeftText, rightText, onChangeRightText }: ComponentProps) {
  const [ignoreKeyOrder, setIgnoreKeyOrder] = useState(true);
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);

  // Compute diff results
  const diffResult = useMemo(() => {
    setLeftError(null);
    setRightError(null);

    let leftObj: any = null;
    let rightObj: any = null;

    if (leftText.trim()) {
      try {
        leftObj = JSON.parse(leftText);
      } catch (err: any) {
        setLeftError(`左侧 JSON 语法错误: ${err.message}`);
        return null;
      }
    }

    if (rightText.trim()) {
      try {
        rightObj = JSON.parse(rightText);
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
  }, [leftText, rightText, ignoreKeyOrder]);

  const handleBeautify = (side: "left" | "right") => {
    const input = side === "left" ? leftText : rightText;
    if (!input.trim()) return;
    try {
      const obj = JSON.parse(input);
      const formatted = JSON.stringify(obj, null, 2);
      if (side === "left") {
        onChangeLeftText(formatted);
        setLeftError(null);
      } else {
        onChangeRightText(formatted);
        setRightError(null);
      }
    } catch (err: any) {
      if (side === "left") setLeftError(`左侧 JSON 格式化失败: ${err.message}`);
      else setRightError(`右侧 JSON 格式化失败: ${err.message}`);
    }
  };

  const handleMinify = (side: "left" | "right") => {
    const input = side === "left" ? leftText : rightText;
    if (!input.trim()) return;
    try {
      const obj = JSON.parse(input);
      const minified = JSON.stringify(obj);
      if (side === "left") {
        onChangeLeftText(minified);
        setLeftError(null);
      } else {
        onChangeRightText(minified);
        setRightError(null);
      }
    } catch (err: any) {
      if (side === "left") setLeftError(`左侧 JSON 压缩失败: ${err.message}`);
      else setRightError(`右侧 JSON 压缩失败: ${err.message}`);
    }
  };

  const handleClear = () => {
    onChangeLeftText("");
    onChangeRightText("");
    setLeftError(null);
    setRightError(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Editor Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontWeight: 600 }}>原始 JSON (左侧)</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="button--secondary" onClick={() => handleBeautify("left")} style={{ padding: "4px 8px", fontSize: "12px", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg-muted)", cursor: "pointer" }}>格式化</button>
              <button type="button" className="button--secondary" onClick={() => handleMinify("left")} style={{ padding: "4px 8px", fontSize: "12px", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg-muted)", cursor: "pointer" }}>压缩</button>
            </div>
          </div>
          <textarea
            value={leftText}
            onChange={(e) => onChangeLeftText(e.target.value)}
            rows={10}
            style={{ width: "100%", fontFamily: "monospace", padding: "10px", fontSize: "13px", border: leftError ? "1px solid var(--danger)" : "1px solid var(--border)", borderRadius: "6px", resize: "vertical" }}
            placeholder="在此粘贴源 JSON..."
          />
          {leftError && <p style={{ color: "var(--danger)", fontSize: "12px", margin: "4px 0 0 0" }}>{leftError}</p>}
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontWeight: 600 }}>对比 JSON (右侧)</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="button--secondary" onClick={() => handleBeautify("right")} style={{ padding: "4px 8px", fontSize: "12px", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg-muted)", cursor: "pointer" }}>格式化</button>
              <button type="button" className="button--secondary" onClick={() => handleMinify("right")} style={{ padding: "4px 8px", fontSize: "12px", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg-muted)", cursor: "pointer" }}>压缩</button>
            </div>
          </div>
          <textarea
            value={rightText}
            onChange={(e) => onChangeRightText(e.target.value)}
            rows={10}
            style={{ width: "100%", fontFamily: "monospace", padding: "10px", fontSize: "13px", border: rightError ? "1px solid var(--danger)" : "1px solid var(--border)", borderRadius: "6px", resize: "vertical" }}
            placeholder="在此粘贴对比 JSON..."
          />
          {rightError && <p style={{ color: "var(--danger)", fontSize: "12px", margin: "4px 0 0 0" }}>{rightError}</p>}
        </div>
      </div>

      {/* Control bar */}
      <div className="tool-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "6px", backgroundColor: "var(--bg-muted)", border: "1px solid var(--border)" }}>
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
        <button type="button" className="button--danger" onClick={handleClear}>清空输入</button>
      </div>

      {/* Diff Result Summary */}
      {diffResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            padding: "8px 12px", 
            backgroundColor: diffResult.stats.totalDiffs === 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)", 
            border: "1px solid", 
            borderColor: diffResult.stats.totalDiffs === 0 ? "var(--success)" : "var(--warning)", 
            borderRadius: "6px" 
          }}>
            <span style={{ fontWeight: 600, color: diffResult.stats.totalDiffs === 0 ? "var(--success)" : "var(--warning)" }}>
              {diffResult.stats.totalDiffs === 0 ? "🎉 两侧 JSON 数据与结构完全一致！" : "⚠️ 检测到 JSON 存在差异："}
            </span>
            {diffResult.stats.totalDiffs > 0 && (
              <div style={{ display: "flex", gap: "16px", fontSize: "14px" }}>
                <span style={{ color: "var(--danger, #ef4444)" }}>❌ 减少: {diffResult.stats.deletions} 行</span>
                <span style={{ color: "var(--success, #10b981)" }}>➕ 增加: {diffResult.stats.additions} 行</span>
                <span style={{ color: "var(--warning, #f59e0b)" }}>🔄 修改: {diffResult.stats.modified} 行</span>
              </div>
            )}
          </div>

          {/* Side by Side Diff Viewer */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.5" }}>
            {/* Left side diff */}
            <div style={{ backgroundColor: "var(--bg-base)", borderRight: "1px solid var(--border)", overflowX: "auto" }}>
              <div style={{ padding: "6px 12px", backgroundColor: "var(--bg-muted)", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: "12px", color: "var(--text-secondary)" }}>原始 JSON (左侧)</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {diffResult.leftLines.map((line, idx) => {
                    const isRemoved = line.type === "removed";
                    const isEmpty = line.type === "empty";
                    const bgColor = isRemoved ? "rgba(239, 68, 68, 0.15)" : isEmpty ? "rgba(0,0,0,0.02)" : "transparent";
                    const textColor = isRemoved ? "var(--danger, #ef4444)" : "var(--text-primary)";
                    return (
                      <tr key={idx} style={{ backgroundColor: bgColor, color: textColor, minHeight: "20px" }}>
                        <td style={{ width: "36px", padding: "0 8px", color: "var(--text-tertiary)", borderRight: "1px solid var(--border)", textAlign: "right", userSelect: "none", backgroundColor: "var(--bg-muted)" }}>
                          {line.num}
                        </td>
                        <td style={{ width: "24px", padding: "0 4px", color: "var(--danger)", textAlign: "center", userSelect: "none" }}>
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
            <div style={{ backgroundColor: "var(--bg-base)", overflowX: "auto" }}>
              <div style={{ padding: "6px 12px", backgroundColor: "var(--bg-muted)", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: "12px", color: "var(--text-secondary)" }}>对比 JSON (右侧)</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {diffResult.rightLines.map((line, idx) => {
                    const isAdded = line.type === "added";
                    const isEmpty = line.type === "empty";
                    const bgColor = isAdded ? "rgba(16, 185, 129, 0.15)" : isEmpty ? "rgba(0,0,0,0.02)" : "transparent";
                    const textColor = isAdded ? "var(--success, #10b981)" : "var(--text-primary)";
                    return (
                      <tr key={idx} style={{ backgroundColor: bgColor, color: textColor, minHeight: "20px" }}>
                        <td style={{ width: "36px", padding: "0 8px", color: "var(--text-tertiary)", borderRight: "1px solid var(--border)", textAlign: "right", userSelect: "none", backgroundColor: "var(--bg-muted)" }}>
                          {line.num}
                        </td>
                        <td style={{ width: "24px", padding: "0 4px", color: "var(--success)", textAlign: "center", userSelect: "none" }}>
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
    </div>
  );
}
