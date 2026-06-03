"use client";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

export default function SvgToJsxTool({ manifest }: ToolAppProps) {
  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <p className="eyebrow">Workspace</p>
        <h2>{manifest.name}</h2>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-panel__content">
        <p>在这里补充 SVG 转 JSX 转换器 的输入、处理和输出区域。</p>
      </div>
    </section>
  );
}
