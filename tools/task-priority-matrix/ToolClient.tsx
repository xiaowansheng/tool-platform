"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface TaskItem {
  id: string;
  name: string;
  impact: number;
  urgency: number;
  confidence: number;
  effort: number;
}

const initialTasks: TaskItem[] = [
  { id: "1", name: "修复登录失败率告警", impact: 5, urgency: 5, confidence: 4, effort: 2 },
  { id: "2", name: "整理下季度路线图", impact: 4, urgency: 3, confidence: 3, effort: 3 },
  { id: "3", name: "清理旧实验开关", impact: 2, urgency: 2, confidence: 5, effort: 2 }
];

function score(task: TaskItem) {
  return ((task.impact * 2 + task.urgency * 1.5 + task.confidence) / Math.max(1, task.effort)).toFixed(2);
}

function quadrant(task: TaskItem) {
  if (task.impact >= 4 && task.urgency >= 4) return "现在做";
  if (task.impact >= 4) return "排期做";
  if (task.urgency >= 4) return "委派/限时处理";
  return "稍后/批处理";
}

export default function TaskPriorityMatrixTool({ manifest }: ToolClientProps) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const sorted = useMemo(() => [...tasks].sort((left, right) => Number(score(right)) - Number(score(left))), [tasks]);
  const plan = sorted.map((task, index) => `${index + 1}. [${quadrant(task)}] ${task.name} - score ${score(task)}`).join("\n");

  function updateTask(id: string, patch: Partial<TaskItem>) {
    setTasks((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
    setCopied(false);
  }

  function addTask() {
    setTasks((items) => [...items, { id: crypto.randomUUID?.() ?? String(Date.now()), name: "New task", impact: 3, urgency: 3, confidence: 3, effort: 3 }]);
  }

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(plan);
      setCopied(true);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">效率</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar">
        <button type="button" onClick={addTask}>新增任务</button>
        <button type="button" onClick={() => setTasks(initialTasks)}>重置示例</button>
        <button type="button" onClick={() => void copyPlan()}>{copied ? "已复制" : "复制清单"}</button>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          {tasks.map((task) => (
            <article className="detail-card" key={task.id}>
              <label className="tool-field">
                <span>任务</span>
                <input value={task.name} onChange={(event) => updateTask(task.id, { name: event.target.value })} />
              </label>
              <div className="tool-toolbar tool-toolbar--grid">
                {(["impact", "urgency", "confidence", "effort"] as const).map((key) => (
                  <label className="tool-field tool-field--compact" key={key}>
                    <span>{key}: {task[key]}</span>
                    <input type="range" min="1" max="5" value={task[key]} onChange={(event) => updateTask(task.id, { [key]: Number(event.target.value) })} />
                  </label>
                ))}
              </div>
              <p>{quadrant(task)} · score {score(task)}</p>
            </article>
          ))}
        </div>

        <label className="tool-field">
          <span>执行顺序</span>
          <textarea value={plan} readOnly spellCheck={false} />
        </label>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">分数用于排序，不替代上下文判断；高影响但低信心的任务通常需要先拆成验证动作。</p>
    </section>
  );
}
