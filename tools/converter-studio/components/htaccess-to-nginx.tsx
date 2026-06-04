"use client";

import { useState, useEffect } from "react";

interface ComponentProps {
  inputText: string;
  onChangeInputText: (text: string) => void;
}

function convertHtaccessToNginx(htaccess: string): string {
  if (!htaccess.trim()) return "";
  const lines = htaccess.split("\n");
  const nginxConfig: string[] = [];
  
  let activeConditions: string[] = [];
  let hostConditions: Array<{ name: string; match: string; op: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      nginxConfig.push("");
      continue;
    }

    if (line.startsWith("#")) {
      nginxConfig.push(line);
      continue;
    }

    if (line.match(/^RewriteEngine\s+/i)) {
      nginxConfig.push(`# ${line} (Nginx 不需要此指令)`);
      continue;
    }

    if (line.match(/^RewriteBase\s+/i)) {
      nginxConfig.push(`# ${line} (Nginx 不需要此指令)`);
      continue;
    }

    const condMatch = line.match(/^RewriteCond\s+(\S+)\s+(\S+)(?:\s+\[(\S+)\])?/i);
    if (condMatch) {
      const test = condMatch[1];
      const condPattern = condMatch[2];
      const flags = condMatch[3] || "";
      const isNoCase = flags.toLowerCase().includes("nc");

      if (test === "%{REQUEST_FILENAME}") {
        if (condPattern === "!-f") {
          activeConditions.push("!-f");
        } else if (condPattern === "!-d") {
          activeConditions.push("!-d");
        } else if (condPattern === "!-s") {
          activeConditions.push("!-s");
        }
      } else if (test === "%{HTTP_HOST}") {
        const cleanPattern = condPattern
          .replace(/^[\^]/, "")
          .replace(/[\$]$/, "")
          .replaceAll("\\.", ".");
        hostConditions.push({
          name: "$http_host",
          match: cleanPattern,
          op: isNoCase ? "~*" : "="
        });
      } else {
        activeConditions.push(`${test} ${isNoCase ? "~*" : "~"} "${condPattern}"`);
      }
      continue;
    }

    const ruleMatch = line.match(/^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[(\S+)\])?/i);
    if (ruleMatch) {
      let pattern = ruleMatch[1];
      let substitution = ruleMatch[2];
      const flags = ruleMatch[3] || "";

      if (!pattern.startsWith("^/")) {
        pattern = pattern.startsWith("^") ? "^/" + pattern.substring(1) : "/" + pattern;
      }
      if (!substitution.startsWith("/") && !substitution.match(/^https?:\/\//i) && substitution !== "-") {
        substitution = "/" + substitution;
      }

      let nginxFlag = "last";
      const flagList = flags.toLowerCase().split(",");
      const isPermanent = flagList.includes("r=301") || flagList.includes("permanent");
      const isRedirect = flagList.includes("r") || flagList.includes("r=302") || flagList.includes("redirect");
      const isNoCase = flagList.includes("nc");
      const isForbidden = flagList.includes("f");
      const isGone = flagList.includes("g");

      if (isPermanent) {
        nginxFlag = "permanent";
      } else if (isRedirect) {
        nginxFlag = "redirect";
      }

      let outputRule = "";
      if (isForbidden) {
        outputRule = `return 403;`;
      } else if (isGone) {
        outputRule = `return 410;`;
      } else if (substitution === "-") {
        outputRule = `return 403; # 重写规则中 "-" 表示阻止访问`;
      } else {
        const rewriteModifier = isNoCase ? "~* " : "";
        outputRule = `rewrite ${rewriteModifier}${pattern} ${substitution} ${nginxFlag};`;
      }

      let conditionBlock = "";
      if (activeConditions.includes("!-f") && activeConditions.includes("!-d")) {
        conditionBlock = `if (!-e $request_filename) {\n    ${outputRule}\n}`;
      } else if (activeConditions.length > 0) {
        const condStr = activeConditions.map(c => {
          if (c === "!-f") return "! -f $request_filename";
          if (c === "!-d") return "! -d $request_filename";
          return c;
        }).join(" && ");
        conditionBlock = `# Nginx 不直接支持 if 多重逻辑，此处转换可能需要细化:\nif (${condStr}) {\n    ${outputRule}\n}`;
      } else if (hostConditions.length > 0) {
        const conds = hostConditions.map(h => `${h.name} ${h.op} "${h.match}"`).join(" && ");
        conditionBlock = `if (${conds}) {\n    ${outputRule}\n}`;
      } else {
        conditionBlock = outputRule;
      }

      nginxConfig.push(conditionBlock);
      activeConditions = [];
      hostConditions = [];
      continue;
    }

    nginxConfig.push(`# 未处理指令: ${line}`);
  }

  return nginxConfig.filter(line => line !== null).join("\n");
}

export default function HtaccessToNginxTab({ inputText, onChangeInputText }: ComponentProps) {
  const [copied, setCopied] = useState(false);
  const [nginxOutput, setNginxOutput] = useState("");

  useEffect(() => {
    setNginxOutput(convertHtaccessToNginx(inputText));
  }, [inputText]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(nginxOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = () => {
    onChangeInputText("");
    setCopied(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="tool-toolbar" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button
          type="button"
          className="button--primary"
          onClick={handleCopy}
          disabled={!nginxOutput}
        >
          {copied ? "已复制" : "复制 Nginx 配置"}
        </button>
        <button type="button" className="button--danger" onClick={handleClear}>
          清空内容
        </button>
      </div>

      <div className="workspace workspace--two-column">
        {/* htaccess Input Pane */}
        <label className="tool-field">
          <span>Apache .htaccess 配置</span>
          <textarea
            value={inputText}
            onChange={(e) => {
              onChangeInputText(e.target.value);
              setCopied(false);
            }}
            placeholder="请在此处粘贴 Apache .htaccess 重写配置代码..."
            spellCheck={false}
            style={{ minHeight: "350px", fontFamily: "monospace" }}
          />
        </label>

        {/* Nginx Output Pane */}
        <label className="tool-field">
          <span>Nginx 规则转换结果</span>
          <textarea
            value={nginxOutput}
            readOnly
            placeholder="Nginx 转换指令将在此处展示..."
            spellCheck={false}
            style={{ minHeight: "350px", fontFamily: "monospace", background: "var(--bg-muted)" }}
          />
        </label>
      </div>

      {/* Additional Tips */}
      <div
        style={{
          padding: "1rem",
          background: "var(--bg-muted)",
          border: "1px solid var(--border)",
          borderRadius: "8px"
        }}
      >
        <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Nginx 转换对比参考指南
        </div>
        <ul style={{ fontSize: "0.8rem", color: "var(--text-secondary)", listStyleType: "disc", paddingLeft: "1.2rem", lineHeight: "1.6" }}>
          <li>
            <strong>`-f` 与 `-d` 排除检查</strong>：在 Nginx 中转换为了常用的 <code>if (!-e $request_filename)</code> 判断。如果是 WordPress 等框架，推荐使用 Nginx 专用的 <code>try_files $uri $uri/ /index.php?$args;</code> 进行性能优化。
          </li>
          <li>
            <strong>永久重定向 (Permanent Redirect)</strong>：Apache 中的 <code>[R=301]</code> 标志被成功转换为 Nginx 对应的 <code>permanent</code> 关键字。
          </li>
          <li>
            <strong>NC (Case-Insensitive) 标志</strong>：转换为 Nginx 正则匹配修饰符 <code>~*</code>。
          </li>
        </ul>
      </div>

      <p className="tool-note" style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
        说明：本转换器运行在本地，支持常规的 Apache RewriteRules 重写和 RewriteCond 条件句转换。复杂或嵌套语法可能需要根据服务器环境手动优化配置。
      </p>
    </div>
  );
}
