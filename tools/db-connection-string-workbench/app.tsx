"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type DbKind = "postgresql" | "mysql" | "redis";

const examples: Record<DbKind, string> = {
  postgresql: "postgresql://app:secret@db.internal:5432/orders?sslmode=require&connect_timeout=10",
  mysql: "mysql://app:secret@mysql.internal:3306/orders?charset=utf8mb4&ssl-mode=REQUIRED",
  redis: "redis://:secret@redis.internal:6379/0?protocol=3"
};

function mask(value: string) {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

function parseDsn(input: string) {
  const url = new URL(input);
  const protocol = url.protocol.replace(":", "");
  const params = Array.from(url.searchParams.entries());

  return {
    protocol,
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    host: url.hostname,
    port: url.port,
    database: url.pathname.replace(/^\//, ""),
    params,
    maskedUrl: `${protocol}://${url.username ? `${encodeURIComponent(decodeURIComponent(url.username))}:${mask(decodeURIComponent(url.password))}@` : ""}${url.host}${url.pathname}${url.search}`
  };
}

function buildEnv(parsed: ReturnType<typeof parseDsn>) {
  const lines = [
    `DB_PROTOCOL=${parsed.protocol}`,
    `DB_HOST=${parsed.host}`,
    `DB_PORT=${parsed.port || ""}`,
    `DB_NAME=${parsed.database}`,
    `DB_USER=${parsed.username}`,
    `DB_PASSWORD=${mask(parsed.password)}`
  ];

  for (const [key, value] of parsed.params) {
    lines.push(`DB_PARAM_${key.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}=${value}`);
  }

  return lines.join("\n");
}

function buildClientCommand(parsed: ReturnType<typeof parseDsn>) {
  if (parsed.protocol.startsWith("postgres")) {
    return `PGPASSWORD='${mask(parsed.password)}' psql -h ${parsed.host} -p ${parsed.port || "5432"} -U ${parsed.username || "USER"} -d ${parsed.database || "DATABASE"}`;
  }

  if (parsed.protocol.startsWith("mysql")) {
    return `mysql -h ${parsed.host} -P ${parsed.port || "3306"} -u ${parsed.username || "USER"} -p ${parsed.database || "DATABASE"}`;
  }

  if (parsed.protocol.startsWith("redis")) {
    return `redis-cli -h ${parsed.host} -p ${parsed.port || "6379"}${parsed.password ? ` -a '${mask(parsed.password)}'` : ""} -n ${parsed.database || "0"}`;
  }

  return "Unsupported protocol";
}

export default function DbConnectionStringWorkbenchTool({ manifest }: ToolAppProps) {
  const [kind, setKind] = useState<DbKind>("postgresql");
  const [input, setInput] = useState(examples.postgresql);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  const parsed = useMemo(() => {
    try {
      setError("");
      return parseDsn(input);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "连接串解析失败");
      return null;
    }
  }, [input]);

  const env = parsed ? buildEnv(parsed) : "";
  const command = parsed ? buildClientCommand(parsed) : "";

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setError("");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败");
    }
  }

  function loadExample(nextKind: DbKind) {
    setKind(nextKind);
    setInput(examples[nextKind]);
    setCopied("");
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数据库</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>类型</span>
          <select value={kind} onChange={(event) => loadExample(event.target.value as DbKind)}>
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="redis">Redis</option>
          </select>
        </label>
        <button type="button" onClick={() => void copy("masked", parsed?.maskedUrl ?? "")} disabled={!parsed}>
          {copied === "masked" ? "已复制" : "复制脱敏 URL"}
        </button>
        <button type="button" onClick={() => void copy("env", env)} disabled={!parsed}>
          {copied === "env" ? "已复制" : "复制 env"}
        </button>
        <button type="button" onClick={() => void copy("command", command)} disabled={!parsed}>
          {copied === "command" ? "已复制" : "复制命令"}
        </button>
      </div>

      <div className="workspace workspace--two-column">
        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>连接串</span>
            <textarea value={input} onChange={(event) => {
              setInput(event.target.value);
              setCopied("");
            }} spellCheck={false} />
          </label>

          <div className="detail-grid">
            <article className="detail-card">
              <h3>协议</h3>
              <p>{parsed?.protocol ?? "-"}</p>
            </article>
            <article className="detail-card">
              <h3>主机</h3>
              <p>{parsed?.host ?? "-"}</p>
            </article>
            <article className="detail-card">
              <h3>端口</h3>
              <p>{parsed?.port || "-"}</p>
            </article>
            <article className="detail-card">
              <h3>参数</h3>
              <p>{parsed?.params.length ?? 0}</p>
            </article>
          </div>
        </div>

        <div className="workspace workspace--stack">
          <label className="tool-field">
            <span>脱敏摘要</span>
            <textarea value={parsed ? JSON.stringify({
              ...parsed,
              password: mask(parsed.password)
            }, null, 2) : ""} readOnly spellCheck={false} />
          </label>
          <div className="mono-output">{command}</div>
          <label className="tool-field">
            <span>环境变量</span>
            <textarea value={env} readOnly spellCheck={false} />
          </label>
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">工具会脱敏展示密码，但浏览器剪贴板仍可能被其他应用读取；生产密钥建议只在受控终端和密钥管理系统中处理。</p>
    </section>
  );
}
