"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type FindingSeverity = "low" | "medium" | "high";

interface AddedLine {
  file: string;
  line: number;
  content: string;
}

interface ReviewRule {
  id: string;
  severity: FindingSeverity;
  message: string;
  action: string;
  regex: RegExp;
  fileRegex?: RegExp;
}

interface PatchFinding {
  rule: ReviewRule;
  file: string;
  line: number;
  content: string;
}

const samplePatch = `diff --git a/src/auth.ts b/src/auth.ts
index 1111111..2222222 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,4 +1,8 @@
 export function canAccess(user) {
+  if (process.env.SKIP_AUTH) return true;
+  const apiKey = "sk_live_1234567890abcdef1234567890";
   return user.role === "admin";
 }
diff --git a/src/db.ts b/src/db.ts
--- a/src/db.ts
+++ b/src/db.ts
@@ -10,3 +10,5 @@
+const query = "SELECT * FROM users WHERE id = " + req.query.id;
+process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";`;

const reviewRules: ReviewRule[] = [
  {
    id: "hardcoded-secret",
    severity: "high",
    message: "新增行疑似硬编码密钥、Token 或密码。",
    action: "移入密钥管理系统，立即轮换已提交的真实凭据。",
    regex: /(api[_-]?key|secret|token|password|client[_-]?secret)\s*[:=]\s*["'][^"']{16,}["']/i
  },
  {
    id: "aws-access-key",
    severity: "high",
    message: "新增行包含 AWS Access Key 形态字符串。",
    action: "撤销凭据，改用环境变量或云端身份角色。",
    regex: /\bAKIA[0-9A-Z]{16}\b/
  },
  {
    id: "private-key",
    severity: "high",
    message: "新增行包含私钥头。",
    action: "从仓库移除私钥并轮换相关证书。",
    regex: /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/
  },
  {
    id: "jwt-token",
    severity: "high",
    message: "新增行疑似包含 JWT。",
    action: "不要提交会话令牌或长期签名 Token。",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/
  },
  {
    id: "dynamic-code-execution",
    severity: "high",
    message: "新增动态代码执行 API。",
    action: "移除 eval / Function，改用受限解析器或显式白名单。",
    regex: /\beval\s*\(|new\s+Function\s*\(|\.innerHTML\s*=|dangerouslySetInnerHTML/
  },
  {
    id: "shell-execution",
    severity: "high",
    message: "新增 shell 或子进程执行路径。",
    action: "避免拼接命令；使用参数数组、白名单和最小权限执行环境。",
    regex: /child_process|exec\s*\(|spawn\s*\(|shell\s*=\s*True|os\.system|Runtime\.getRuntime\(\)\.exec/
  },
  {
    id: "sql-concatenation",
    severity: "high",
    message: "SQL 语句疑似通过字符串拼接构造。",
    action: "改用参数化查询、ORM bind 参数或预编译语句。",
    regex: /(SELECT|INSERT|UPDATE|DELETE)[^;\n]*("|'|`)?\s*\+|\+\s*(req|request|ctx|params|query)\./i
  },
  {
    id: "tls-disabled",
    severity: "high",
    message: "新增禁用 TLS 校验的配置。",
    action: "恢复证书校验，修复证书链或信任根配置。",
    regex: /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0|verify\s*=\s*False|curl\s+-k/i
  },
  {
    id: "auth-bypass",
    severity: "high",
    message: "认证/授权路径新增无条件放行。",
    action: "确认调试开关不能进入生产路径，并添加测试覆盖。",
    regex: /return\s+true|allow\s*=\s*true|isAdmin\s*=\s*true|SKIP_AUTH|disableAuth/i,
    fileRegex: /auth|permission|policy|guard|middleware/i
  },
  {
    id: "weak-crypto",
    severity: "medium",
    message: "新增弱加密、弱摘要或不适合安全用途的随机数。",
    action: "使用 SHA-256+、Web Crypto / crypto.randomBytes，并避免 MD5、SHA1、Math.random 生成凭据。",
    regex: /createHash\(["'](?:md5|sha1)["']\)|\bMD5\b|\bSHA1\b|Math\.random\(\).*?(token|secret|password)|randomBytes\(4\)/i
  },
  {
    id: "permissive-cors",
    severity: "medium",
    message: "新增宽松 CORS 配置。",
    action: "限制 Origin 白名单；Credentials 模式下禁止 wildcard。",
    regex: /Access-Control-Allow-Origin:\s*\*|origin\s*:\s*["']\*["']|allowOrigins?\s*=\s*\["\*"\]/i
  },
  {
    id: "insecure-cookie",
    severity: "medium",
    message: "新增不安全 Cookie 配置。",
    action: "会话 Cookie 应启用 Secure、HttpOnly 和 SameSite。",
    regex: /secure\s*:\s*false|httpOnly\s*:\s*false|SameSite=None(?!.*Secure)/i
  },
  {
    id: "container-privilege",
    severity: "medium",
    message: "新增容器或文件权限放宽配置。",
    action: "避免 privileged、hostNetwork 和 chmod 777，改用最小权限。",
    regex: /privileged:\s*true|--privileged|hostNetwork:\s*true|chmod\s+777/i
  },
  {
    id: "ssrf-input-url",
    severity: "medium",
    message: "新增从请求参数直接发起外部请求的路径。",
    action: "增加 URL allowlist、私网地址拦截、重定向限制和超时。",
    regex: /(fetch|axios\.(?:get|post)|request)\s*\(\s*(req|request|ctx|params|query)\./i
  }
];

function parsePatch(input: string): AddedLine[] {
  const added: AddedLine[] = [];
  let currentFile = "unknown";
  let nextLine = 0;

  for (const rawLine of input.split(/\r?\n/)) {
    if (rawLine.startsWith("diff --git ")) {
      const match = rawLine.match(/ b\/(.+)$/);
      currentFile = match?.[1] ?? currentFile;
      nextLine = 0;
      continue;
    }

    if (rawLine.startsWith("+++ ")) {
      currentFile = rawLine.replace(/^\+\+\+\s+b?\//, "").trim();
      continue;
    }

    if (rawLine.startsWith("@@")) {
      const match = rawLine.match(/\+(\d+)/);
      nextLine = Number(match?.[1] ?? "0");
      continue;
    }

    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      added.push({
        file: currentFile,
        line: nextLine || 1,
        content: rawLine.slice(1)
      });
      nextLine += 1;
      continue;
    }

    if (!rawLine.startsWith("-") && nextLine > 0) {
      nextLine += 1;
    }
  }

  return added;
}

function reviewPatch(input: string) {
  const addedLines = parsePatch(input);
  const findings: PatchFinding[] = [];

  for (const line of addedLines) {
    for (const rule of reviewRules) {
      if (rule.fileRegex && !rule.fileRegex.test(line.file)) continue;
      if (rule.regex.test(line.content)) {
        findings.push({
          rule,
          file: line.file,
          line: line.line,
          content: line.content
        });
      }
    }
  }

  return { addedLines, findings };
}

function severityLabel(severity: FindingSeverity) {
  if (severity === "high") return "高";
  if (severity === "medium") return "中";
  return "低";
}

export default function GitPatchSecurityReviewerTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(samplePatch);
  const [minimumSeverity, setMinimumSeverity] = useState<FindingSeverity>("low");
  const severityOrder: Record<FindingSeverity, number> = { low: 1, medium: 2, high: 3 };
  const review = useMemo(() => reviewPatch(input), [input]);
  const visibleFindings = review.findings.filter((finding) => severityOrder[finding.rule.severity] >= severityOrder[minimumSeverity]);
  const counts = review.findings.reduce(
    (summary, finding) => ({
      high: summary.high + (finding.rule.severity === "high" ? 1 : 0),
      medium: summary.medium + (finding.rule.severity === "medium" ? 1 : 0),
      low: summary.low + (finding.rule.severity === "low" ? 1 : 0)
    }),
    { high: 0, medium: 0, low: 0 }
  );

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">安全代码审查</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>最低严重级别</span>
          <select value={minimumSeverity} onChange={(event) => setMinimumSeverity(event.target.value as FindingSeverity)}>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </label>
      </div>

      <label className="tool-field">
        <span>Git diff</span>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      </label>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>新增行</h3>
          <p>{review.addedLines.length}</p>
        </article>
        <article className="detail-card">
          <h3>高风险</h3>
          <p>{counts.high}</p>
        </article>
        <article className="detail-card">
          <h3>中风险</h3>
          <p>{counts.medium}</p>
        </article>
        <article className="detail-card">
          <h3>低风险</h3>
          <p>{counts.low}</p>
        </article>
      </div>

      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>位置</span>
          <span>发现项</span>
        </div>
        {visibleFindings.length > 0 ? visibleFindings.map((finding) => (
          <div key={`${finding.rule.id}-${finding.file}-${finding.line}-${finding.content}`} className="tool-table__row">
            <span>
              <strong>{finding.file}:{finding.line}</strong><br />
              <span className="tag">{severityLabel(finding.rule.severity)}</span>
            </span>
            <span>
              {finding.rule.message}<br />
              <code className="mono-output">{finding.content.trim()}</code><br />
              {finding.rule.action}
            </span>
          </div>
        )) : (
          <div className="tool-table__row">
            <span>未发现</span>
            <span>当前新增行未命中内置安全审查规则。</span>
          </div>
        )}
      </div>
      <p className="tool-note">静态规则用于预审差异，不替代人工代码审查和项目级安全测试。</p>
    </section>
  );
}
