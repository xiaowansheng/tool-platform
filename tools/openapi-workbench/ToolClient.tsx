"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface OpenApiOperation {
  summary?: string;
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: unknown }> }>;
}

interface OpenApiDocument {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; version?: string };
  paths?: Record<string, Record<string, OpenApiOperation>>;
}

const sampleSpec = JSON.stringify({
  openapi: "3.0.0",
  info: { title: "Tool API", version: "1.0.0" },
  paths: {
    "/tools": {
      get: {
        summary: "List tools",
        responses: { "200": { description: "OK" } }
      }
    }
  }
}, null, 2);

function parseSpec(input: string): OpenApiDocument {
  return JSON.parse(input) as OpenApiDocument;
}

function listOperations(spec: OpenApiDocument) {
  return Object.entries(spec.paths ?? {}).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) => ({
      method: method.toUpperCase(),
      path,
      summary: operation.summary ?? "无摘要",
      responses: Object.keys(operation.responses ?? {}).join(", ") || "无"
    }))
  );
}

function diffLines(left: string, right: string) {
  const leftLines = left.split(/\r?\n/);
  const rightLines = right.split(/\r?\n/);
  const max = Math.max(leftLines.length, rightLines.length);

  return Array.from({ length: max }, (_, index) => {
    const before = leftLines[index] ?? "";
    const after = rightLines[index] ?? "";
    return before === after ? `  ${before}` : `- ${before}\n+ ${after}`;
  }).join("\n");
}

function mockFromSpec(spec: OpenApiDocument) {
  const operation = listOperations(spec)[0];

  if (!operation) return "{}";

  return JSON.stringify({
    path: operation.path,
    method: operation.method,
    status: 200,
    data: {
      id: "mock-id",
      message: operation.summary
    }
  }, null, 2);
}

export default function OpenApiWorkbenchTool({ manifest }: ToolClientProps) {
  const [left, setLeft] = useState(sampleSpec);
  const [right, setRight] = useState(sampleSpec.replace("List tools", "List available tools"));
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function run(action: "format" | "summary" | "diff" | "mock") {
    try {
      const spec = parseSpec(left);
      if (action === "format") setOutput(JSON.stringify(spec, null, 2));
      if (action === "summary") setOutput(JSON.stringify({ info: spec.info, version: spec.openapi ?? spec.swagger, operations: listOperations(spec) }, null, 2));
      if (action === "diff") setOutput(diffLines(JSON.stringify(parseSpec(left), null, 2), JSON.stringify(parseSpec(right), null, 2)));
      if (action === "mock") setOutput(mockFromSpec(spec));
      setError("");
      setCopied(false);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "OpenAPI 处理失败");
    }
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">API 工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <button type="button" onClick={() => run("format")}>格式化</button>
        <button type="button" onClick={() => run("summary")}>查看摘要</button>
        <button type="button" onClick={() => run("diff")}>差异</button>
        <button type="button" onClick={() => run("mock")}>生成 Mock</button>
        <button type="button" onClick={() => void copyOutput()} disabled={!output}>{copied ? "已复制" : "复制输出"}</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>规格 A JSON</span>
          <textarea value={left} onChange={(event) => setLeft(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>用于差异的规格 B JSON</span>
          <textarea value={right} onChange={(event) => setRight(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <label className="tool-field">
        <span>输出</span>
        <textarea value={output} onChange={(event) => setOutput(event.target.value)} spellCheck={false} />
      </label>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
