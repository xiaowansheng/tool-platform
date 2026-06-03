"use client";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function ChineseZodiacTool({ manifest }: ToolAppProps) {
  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <p className="eyebrow">Workspace</p>
        <h2>{manifest.name}</h2>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-panel__content">
        <p>在这里补充 生肖查询工具 的输入、处理和输出区域。</p>
      </div>
    </section>
  );
}
