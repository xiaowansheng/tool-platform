"use client";

import { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const initialNames = `张三
李四
王五
赵六
孙七
周八
吴九
郑十
钱一一
陈一二
卫一三
蒋一四`;

const initialConflicts = `张三,李四
王五,赵六`;

// Seed-based pseudorandom number generator (LCG)
function createSeededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export default function RandomTeamGenerator({ manifest }: ToolAppProps) {
  const [namesText, setNamesText] = useState(initialNames);
  const [conflictsText, setConflictsText] = useState(initialConflicts);
  const [mode, setMode] = useState<"teams" | "size">("teams");
  const [targetNum, setTargetNum] = useState<number>(3);
  const [seed, setSeed] = useState<string>("42");
  const [teamNaming, setTeamNaming] = useState<"numeric" | "alphabetic" | "creative">("numeric");
  const [result, setResult] = useState<{ teams: string[][]; warnings: string[] } | null>(null);

  const creativeNames = [
    "飞龙队", "猛虎队", "战狼队", "猎鹰队", "雷神队",
    "烈火队", "寒冰队", "闪电队", "金星队", "木星队",
    "水星队", "火星队", "土星队", "天王队", "海王队"
  ];

  const handleGenerate = () => {
    const names = namesText
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) {
      setResult(null);
      return;
    }

    // Parse conflicts: e.g., ["张三,李四", "王五,赵六"]
    // Represented as an adjacency list of names that cannot be in the same group
    const conflicts: [string, string][] = conflictsText
      .split("\n")
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
      .map((c) => {
        const parts = c.split(",").map((p) => p.trim());
        return parts.length >= 2 ? [parts[0], parts[1]] : null;
      })
      .filter((c): c is [string, string] => c !== null);

    const parsedSeed = parseInt(seed) || Math.floor(Math.random() * 1000000);
    const rand = createSeededRandom(parsedSeed);

    const numMembers = names.length;
    let numTeams = 1;

    if (mode === "teams") {
      numTeams = Math.max(1, Math.min(numMembers, targetNum));
    } else {
      const teamSize = Math.max(1, Math.min(numMembers, targetNum));
      numTeams = Math.ceil(numMembers / teamSize);
    }

    // Try up to 200 times to find a partition that satisfies all conflicts
    let bestTeams: string[][] = [];
    let minConflictCount = Infinity;
    let finalWarnings: string[] = [];

    for (let attempt = 0; attempt < 200; attempt++) {
      // 1. Shuffle names using seeded random
      const shuffled = [...names];
      for (let idx = shuffled.length - 1; idx > 0; idx--) {
        const swapIdx = Math.floor(rand() * (idx + 1));
        const temp = shuffled[idx];
        shuffled[idx] = shuffled[swapIdx];
        shuffled[swapIdx] = temp;
      }

      // 2. Distribute into teams
      const currentTeams: string[][] = Array.from({ length: numTeams }, () => []);
      for (let idx = 0; idx < shuffled.length; idx++) {
        currentTeams[idx % numTeams].push(shuffled[idx]);
      }

      // 3. Count conflict violations
      let currentConflicts = 0;
      for (const team of currentTeams) {
        const teamSet = new Set(team);
        for (const [p1, p2] of conflicts) {
          if (teamSet.has(p1) && teamSet.has(p2)) {
            currentConflicts++;
          }
        }
      }

      if (currentConflicts === 0) {
        bestTeams = currentTeams;
        minConflictCount = 0;
        break;
      }

      if (currentConflicts < minConflictCount) {
        minConflictCount = currentConflicts;
        bestTeams = currentTeams;
      }
    }

    if (minConflictCount > 0) {
      finalWarnings.push(`无法完全避开同组冲突。当前结果中仍存在 ${minConflictCount} 对冲突关系被分配在同一组内。`);
    }

    setResult({
      teams: bestTeams,
      warnings: finalWarnings
    });
  };

  const getTeamName = (index: number) => {
    if (teamNaming === "numeric") {
      return `第 ${index + 1} 队`;
    } else if (teamNaming === "alphabetic") {
      return `队伍 ${String.fromCharCode(65 + (index % 26))}`;
    } else {
      return creativeNames[index % creativeNames.length];
    }
  };

  const formattedResult = useMemo(() => {
    if (!result) return "";

    const textLines: string[] = [];
    result.teams.forEach((team, tIdx) => {
      textLines.push(`【${getTeamName(tIdx)}】`);
      textLines.push(team.join("，"));
      textLines.push("");
    });
    return textLines.join("\n");
  }, [result, teamNaming]);

  const copyToClipboard = async () => {
    if (!formattedResult) return;
    try {
      await navigator.clipboard.writeText(formattedResult);
      alert("复制成功");
    } catch {
      // ignore
    }
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">效率工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--two-column" style={{ gap: "24px" }}>
        {/* Left Column: Form & Configuration */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label className="tool-field" style={{ flex: 1 }}>
            <span>成员名单 (每行一个姓名)</span>
            <textarea
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              style={{ minHeight: "180px", fontSize: "14px" }}
              placeholder="请输入分队成员..."
            />
          </label>

          <label className="tool-field">
            <span>避开冲突对 (以逗号分隔，如: 张三,李四)</span>
            <textarea
              value={conflictsText}
              onChange={(e) => setConflictsText(e.target.value)}
              style={{ minHeight: "80px", fontSize: "13px" }}
              placeholder="两名冲突的成员在分队时会尽量分配到不同队伍中..."
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <label className="tool-field">
              <span>分队模式</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
                <option value="teams">指定队伍数量</option>
                <option value="size">指定每队人数</option>
              </select>
            </label>

            <label className="tool-field">
              <span>{mode === "teams" ? "目标队伍数量" : "每队最大人数"}</span>
              <input
                type="number"
                min={1}
                value={targetNum}
                onChange={(e) => setTargetNum(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <label className="tool-field">
              <span>随机种子 (数字，保证重复性)</span>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
              />
            </label>

            <label className="tool-field">
              <span>队伍命名</span>
              <select value={teamNaming} onChange={(e) => setTeamNaming(e.target.value as any)}>
                <option value="numeric">数字序号 (第 1 队)</option>
                <option value="alphabetic">字母标号 (队伍 A)</option>
                <option value="creative">创意队名 (飞龙/猛虎)</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            className="button--primary"
            onClick={handleGenerate}
            style={{ padding: "12px", width: "100%" }}
          >
            🎲 随机分配队伍
          </button>
        </div>

        {/* Right Column: Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600 }}>分组结果</h3>
            {result && (
              <button type="button" onClick={copyToClipboard} style={{ padding: "4px 8px", fontSize: "13px" }}>
                复制全部结果
              </button>
            )}
          </div>

          {result ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {result.warnings.map((w, wIdx) => (
                <p key={wIdx} className="tool-error" style={{ margin: 0 }}>
                  ⚠️ {w}
                </p>
              ))}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {result.teams.map((team, tIdx) => (
                  <article
                    key={tIdx}
                    className="detail-card"
                    style={{
                      border: "1px solid rgba(0,0,0,0.08)",
                      padding: "16px",
                      borderRadius: "8px",
                      backgroundColor: "var(--background-card, #fff)"
                    }}
                  >
                    <h4 style={{ margin: "0 0 10px 0", fontWeight: 600, color: "#3b82f6" }}>
                      {getTeamName(tIdx)} ({team.length}人)
                    </h4>
                    <ul style={{ paddingLeft: "16px", margin: 0 }}>
                      {team.map((member, mIdx) => (
                        <li key={mIdx} style={{ fontSize: "14px", margin: "4px 0" }}>
                          {member}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ opacity: 0.6, fontSize: "14px", fontStyle: "italic", textAlign: "center", paddingTop: "50px" }}>
              请在左侧输入名单并点击“随机分配队伍”按钮。
            </p>
          )}
        </div>
      </div>

      {result && (
        <div className="detail-grid" style={{ marginTop: "24px" }}>
          <article className="detail-card">
            <h3>总分配人数</h3>
            <p>{namesText.split("\n").filter((n) => n.trim().length > 0).length} 人</p>
          </article>
          <article className="detail-card">
            <h3>分出队伍数</h3>
            <p>{result.teams.length} 支</p>
          </article>
          <article className="detail-card">
            <h3>平均每队人数</h3>
            <p>
              {(
                namesText.split("\n").filter((n) => n.trim().length > 0).length /
                result.teams.length
              ).toFixed(1)}{" "}
              人
            </p>
          </article>
        </div>
      )}
    </section>
  );
}
