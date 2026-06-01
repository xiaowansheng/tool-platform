"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const groups = ["owner", "group", "other"] as const;
const permissions = [
  { key: "r", label: "读取", value: 4 },
  { key: "w", label: "写入", value: 2 },
  { key: "x", label: "执行", value: 1 }
] as const;

type Group = (typeof groups)[number];
type Permission = (typeof permissions)[number]["key"];

function defaultState() {
  return {
    owner: { r: true, w: true, x: true },
    group: { r: true, w: false, x: true },
    other: { r: true, w: false, x: true }
  } satisfies Record<Group, Record<Permission, boolean>>;
}

export default function ChmodCalculatorTool({ manifest }: ToolClientProps) {
  const [state, setState] = useState(defaultState);
  const digits = groups.map((group) =>
    permissions.reduce((total, permission) => total + (state[group][permission.key] ? permission.value : 0), 0)
  ).join("");
  const symbolic = groups.map((group) =>
    permissions.map((permission) => state[group][permission.key] ? permission.key : "-").join("")
  ).join("");

  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(`chmod ${digits} file`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">运维工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="case-grid">
        {groups.map((group) => (
          <article key={group} className="detail-card">
            <h3>{{ owner: "所有者", group: "用户组", other: "其他用户" }[group]}</h3>
            <div className="tool-option-list">
              {permissions.map((permission) => (
                <label key={permission.key} className="tool-check">
                  <input
                    type="checkbox"
                    checked={state[group][permission.key]}
                    onChange={(event) => setState((current) => ({
                      ...current,
                      [group]: {
                        ...current[group],
                        [permission.key]: event.target.checked
                      }
                    }))}
                  />
                  <span>{permission.label}</span>
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>数字权限</h3>
          <p>{digits}</p>
        </article>
        <article className="detail-card">
          <h3>符号权限</h3>
          <p>{symbolic}</p>
        </article>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void copyCommand()}>{copied ? "已复制" : "复制 chmod 命令"}</button>
      </div>
    </section>
  );
}
