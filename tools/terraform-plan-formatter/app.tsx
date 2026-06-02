"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Action = "create" | "update" | "delete" | "replace" | "read" | "unknown";
type Filter = Action | "all";

interface ResourceChange {
  address: string;
  action: Action;
  details: string[];
}

const samplePlan = `Terraform will perform the following actions:

  # aws_security_group.api will be updated in-place
  ~ resource "aws_security_group" "api" {
      ~ description = "API" -> "API ingress"
    }

  # aws_instance.worker will be created
  + resource "aws_instance" "worker" {
      + ami           = "ami-123456"
      + instance_type = "t3.small"
    }

  # aws_db_instance.legacy will be destroyed
  - resource "aws_db_instance" "legacy" {
      - identifier = "legacy"
    }

Plan: 1 to add, 1 to change, 1 to destroy.`;

function actionFromPhrase(phrase: string): Action {
  if (/created/i.test(phrase)) return "create";
  if (/updated/i.test(phrase)) return "update";
  if (/destroyed/i.test(phrase)) return "delete";
  if (/replaced/i.test(phrase)) return "replace";
  if (/read/i.test(phrase)) return "read";

  return "unknown";
}

function parsePlan(source: string): ResourceChange[] {
  const changes: ResourceChange[] = [];
  let current: ResourceChange | null = null;

  source.split(/\r?\n/).forEach((line) => {
    const header = line.match(/^\s*#\s+(.+?)\s+will be\s+(.+)$/);

    if (header) {
      if (current) changes.push(current);
      current = {
        address: header[1] ?? "unknown",
        action: actionFromPhrase(header[2] ?? ""),
        details: []
      };
      return;
    }

    if (current) {
      current.details.push(line);
    }
  });

  if (current) changes.push(current);

  return changes;
}

function summarize(changes: ResourceChange[]) {
  return changes.reduce(
    (summary, change) => ({
      create: summary.create + (change.action === "create" ? 1 : 0),
      update: summary.update + (change.action === "update" ? 1 : 0),
      delete: summary.delete + (change.action === "delete" ? 1 : 0),
      replace: summary.replace + (change.action === "replace" ? 1 : 0)
    }),
    { create: 0, update: 0, delete: 0, replace: 0 }
  );
}

function formatChanges(changes: ResourceChange[]) {
  return changes.map((change) => {
    const detail = change.details
      .filter((line) => /^[\s]*[+\-~]/.test(line))
      .join("\n")
      .trim();

    return `[${change.action}] ${change.address}${detail ? `\n${detail}` : ""}`;
  }).join("\n\n");
}

function lineClass(line: string) {
  if (/^\s*-/.test(line) || /\[delete\]|\[replace\]/.test(line)) return "removed";
  if (/^\s*\+/.test(line) || /\[create\]|\[update\]/.test(line)) return "added";
  return "equal";
}

export default function TerraformPlanFormatterTool({ manifest }: ToolAppProps) {
  const [source, setSource] = useState(samplePlan);
  const [filter, setFilter] = useState<Filter>("all");
  const changes = useMemo(() => parsePlan(source), [source]);
  const visibleChanges = filter === "all" ? changes : changes.filter((change) => change.action === filter);
  const summary = summarize(changes);
  const output = formatChanges(visibleChanges);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">IaC 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>过滤操作</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
            <option value="all">全部</option>
            <option value="create">创建</option>
            <option value="update">更新</option>
            <option value="delete">删除</option>
            <option value="replace">替换</option>
            <option value="read">读取</option>
          </select>
        </label>
      </div>
      <label className="tool-field">
        <span>terraform plan 输出</span>
        <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} />
      </label>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>创建</h3>
          <p>{summary.create}</p>
        </article>
        <article className="detail-card">
          <h3>更新</h3>
          <p>{summary.update}</p>
        </article>
        <article className="detail-card">
          <h3>删除</h3>
          <p>{summary.delete}</p>
        </article>
        <article className="detail-card">
          <h3>替换</h3>
          <p>{summary.replace}</p>
        </article>
      </div>
      <article className="diff-view" aria-label="格式化后的 Terraform plan">
        {(output || "没有匹配的资源变更").split(/\r?\n/).map((line, index) => (
          <div key={`${line}-${index}`} className={`diff-line diff-line--${lineClass(line)}`}>
            <span>{/^\s*-/.test(line) ? "-" : /^\s*\+/.test(line) ? "+" : /^\s*~/.test(line) ? "~" : " "}</span>
            <code>{line || " "}</code>
          </div>
        ))}
      </article>
    </section>
  );
}
