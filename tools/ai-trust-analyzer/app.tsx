"use client";

import { useState } from "react";
import { AiTrustWorkspace, type AiTrustToolId } from "@tool-platform/ai-trust-tools";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const toolOptions: Array<{ id: AiTrustToolId; label: string }> = [
  { id: "ai-generated-code-risk-checker", label: "AI 代码风险扫描" },
  { id: "prompt-injection-detector", label: "Prompt Injection 检测" },
  { id: "llm-fact-check-checklist-generator", label: "LLM 事实核查清单" },
  { id: "pr-change-risk-summarizer", label: "PR 变更风险摘要" },
  { id: "test-case-generator", label: "测试用例生成" },
  { id: "bug-report-repro-steps-generator", label: "Bug 复现步骤生成" },
  { id: "error-log-troubleshooting-path-generator", label: "错误日志排查路径" },
  { id: "stack-trace-explainer", label: "堆栈追踪解释" },
  { id: "api-docs-sdk-example-generator", label: "API SDK 示例生成" },
  { id: "code-snippet-security-review", label: "代码片段安全审查" },
  { id: "ai-prompt-version-diff", label: "Prompt 版本差异对比" },
  { id: "agent-behavior-log-viewer", label: "Agent 行为日志查看" },
  { id: "llm-eval-case-generator", label: "LLM 评测用例生成" },
  { id: "rag-chunk-token-estimator", label: "RAG 分块 Token 估算" },
  { id: "token-cost-calculator", label: "Token 成本计算" },
];

export default function AiTrustAnalyzerTool({ manifest }: ToolAppProps) {
  const [toolId, setToolId] = useState<AiTrustToolId>("ai-generated-code-risk-checker");

  return (
    <div>
      <div className="tool-toolbar" style={{ marginBottom: 16 }}>
        <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
          <span>选择分析工具</span>
          <select value={toolId} onChange={(e) => setToolId(e.target.value as AiTrustToolId)}>
            {toolOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </label>
      </div>
      <AiTrustWorkspace key={toolId} manifest={manifest} toolId={toolId} />
    </div>
  );
}
