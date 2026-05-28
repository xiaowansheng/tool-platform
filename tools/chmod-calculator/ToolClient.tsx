"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const groups = ["owner", "group", "other"] as const;
const permissions = [
  { key: "r", label: "read", value: 4 },
  { key: "w", label: "write", value: 2 },
  { key: "x", label: "execute", value: 1 }
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

  async function copyCommand() {
    await navigator.clipboard.writeText(`chmod ${digits} file`);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Ops Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="case-grid">
        {groups.map((group) => (
          <article key={group} className="detail-card">
            <h3>{group}</h3>
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
          <h3>Numeric</h3>
          <p>{digits}</p>
        </article>
        <article className="detail-card">
          <h3>Symbolic</h3>
          <p>{symbolic}</p>
        </article>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => void copyCommand()}>复制 chmod 命令</button>
      </div>
    </section>
  );
}
