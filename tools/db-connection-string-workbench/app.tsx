"use client";

import { useEffect, useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

type DbKind = "postgresql" | "mysql" | "redis" | "mongodb" | "sqlserver" | "oracle" | "clickhouse" | "sqlite";

interface ParamItem {
  id: string;
  key: string;
  value: string;
}

const examples: Record<DbKind, string> = {
  postgresql: "postgresql://app_user:sec_pwd@db.internal:5432/orders_db?sslmode=require&connect_timeout=10",
  mysql: "mysql://db_admin:sql_pass@mysql.internal:3306/production_db?charset=utf8mb4&ssl-mode=REQUIRED",
  redis: "redis://:redis_secret@redis.internal:6379/0?protocol=3",
  mongodb: "mongodb://mongo_user:mongo_pass@host1:27017,host2:27017/analytics_db?replicaSet=rs0&authSource=admin",
  sqlserver: "sqlserver://sa:sa_password@sqlserver.internal:1433/enterprise_db?encrypt=true&trustServerCertificate=true",
  oracle: "oracle://system:oracle_pwd@oracle.internal:1521/ORCL",
  clickhouse: "clickhouse://default:ch_pwd@clickhouse.internal:8123/default?compress=1",
  sqlite: "sqlite:///var/data/app.db"
};

function mask(value: string) {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

// Custom parser to handle all database types safely without failing on non-http schemes
function parseDsn(input: string, kind: DbKind) {
  const cleanInput = input.trim();
  
  if (kind === "sqlite") {
    // sqlite has no credentials, just format or path
    const path = cleanInput.replace(/^sqlite:(\/\/)?/, "");
    return {
      protocol: "sqlite",
      username: "",
      password: "",
      host: "local",
      port: "",
      database: path,
      params: [] as [string, string][]
    };
  }

  // General URI parsing fallback
  let protocol: string = kind;
  let username = "";
  let password = "";
  let host = "localhost";
  let port = "";
  let database = "";
  const params: [string, string][] = [];

  try {
    // Standard URL parser (works for most, e.g. postgres, mysql, mongodb, redis, clickhouse, oracle)
    const url = new URL(cleanInput.startsWith("jdbc:") ? cleanInput.replace("jdbc:", "") : cleanInput);
    protocol = url.protocol.replace(":", "");
    username = decodeURIComponent(url.username || "");
    password = decodeURIComponent(url.password || "");
    host = url.hostname || url.host;
    port = url.port || "";
    database = url.pathname.replace(/^\//, "");
    url.searchParams.forEach((v, k) => {
      params.push([k, v]);
    });
  } catch {
    // Custom regex parser if URL throws (e.g. multi-host mongodb or SQL Server semi-colons)
    const match = cleanInput.match(/^([a-zA-Z0-9+.-]+):\/\/([^/]+)(.*)$/);
    if (match) {
      protocol = match[1] || kind;
      let authority = match[2] || "";
      const pathAndQuery = match[3] || "";

      // Parse authority (user:pass@host1,host2:port)
      const atIdx = authority.indexOf("@");
      if (atIdx !== -1) {
        const creds = authority.slice(0, atIdx);
        authority = authority.slice(atIdx + 1);
        const colonIdx = creds.indexOf(":");
        if (colonIdx !== -1) {
          username = decodeURIComponent(creds.slice(0, colonIdx));
          password = decodeURIComponent(creds.slice(colonIdx + 1));
        } else {
          username = decodeURIComponent(creds);
        }
      }

      host = authority;
      const portMatch = authority.match(/:(\d+)$/);
      if (portMatch) {
        port = portMatch[1] || "";
        host = authority.slice(0, authority.length - port.length - 1);
      }

      // Parse database & query params
      const qIdx = pathAndQuery.indexOf("?");
      let rawPath = qIdx !== -1 ? pathAndQuery.slice(0, qIdx) : pathAndQuery;
      database = rawPath.replace(/^\//, "");
      
      if (qIdx !== -1) {
        const queryStr = pathAndQuery.slice(qIdx + 1);
        queryStr.split("&").forEach(pair => {
          const parts = pair.split("=");
          if (parts[0]) {
            params.push([
              decodeURIComponent(parts[0]),
              decodeURIComponent(parts[1] || "")
            ]);
          }
        });
      }
    }
  }

  return { protocol, username, password, host, port, database, params };
}

// Generate code snippets based on parsed info
function generateCodeSnippets(parsed: ReturnType<typeof parseDsn>, kind: DbKind) {
  const pass = parsed.password;
  const maskedPass = mask(pass);
  const host = parsed.host;
  const port = parsed.port;
  const user = parsed.username;
  const db = parsed.database;

  switch (kind) {
    case "postgresql":
      return {
        nodejs: `const { Pool } = require('pg');\nconst pool = new Pool({\n  connectionString: 'postgresql://${user}:${maskedPass}@${host}:${port || "5432"}/${db}',\n  ssl: { rejectUnauthorized: false }\n});`,
        python: `import psycopg2\nconn = psycopg2.connect(\n    host="${host}",\n    database="${db}",\n    user="${user}",\n    password="${maskedPass}",\n    port="${port || "5432"}"\n)`,
        jdbc: `jdbc:postgresql://${host}:${port || "5432"}/${db}`
      };
    case "mysql":
      return {
        nodejs: `const mysql = require('mysql2');\nconst connection = mysql.createConnection({\n  host: '${host}',\n  port: ${port || "3306"},\n  user: '${user}',\n  password: '${maskedPass}',\n  database: '${db}'\n});`,
        python: `import pymysql\nconnection = pymysql.connect(\n    host='${host}',\n    port=${port ? parseInt(port) : 3306},\n    user='${user}',\n    password='${maskedPass}',\n    database='${db}',\n    charset='utf8mb4'\n)`,
        jdbc: `jdbc:mysql://${host}:${port || "3306"}/${db}?useSSL=true`
      };
    case "redis":
      return {
        nodejs: `const Redis = require('ioredis');\nconst redis = new Redis('redis://:${maskedPass}@${host}:${port || "6379"}/${db || "0"}');`,
        python: `import redis\nr = redis.Redis(\n    host='${host}',\n    port=${port || "6379"},\n    password='${maskedPass}',\n    db=${db || "0"}\n)`,
        jdbc: `redis://${host}:${port || "6379"}/${db || "0"}`
      };
    case "mongodb":
      return {
        nodejs: `const { MongoClient } = require('mongodb');\nconst url = 'mongodb://${user}:${maskedPass}@${host}/${db}';\nconst client = new MongoClient(url);\nawait client.connect();`,
        python: `from pymongo import MongoClient\nclient = MongoClient('mongodb://${user}:${maskedPass}@${host}/${db}')\ndb = client['${db}']`,
        jdbc: `mongodb://${user}:${maskedPass}@${host}/${db}`
      };
    case "sqlserver":
      return {
        nodejs: `const sql = require('mssql');\nconst config = {\n  user: '${user}',\n  password: '${maskedPass}',\n  server: '${host}',\n  database: '${db}',\n  port: ${port ? parseInt(port) : 1433},\n  options: { encrypt: true }\n};`,
        python: `import pymssql\nconn = pymssql.connect(\n    server='${host}',\n    user='${user}',\n    password='${maskedPass}',\n    database='${db}',\n    port=${port || "1433"}\n)`,
        jdbc: `jdbc:sqlserver://${host}:${port || "1433"};databaseName=${db};user=${user};password=${maskedPass};`
      };
    case "oracle":
      return {
        nodejs: `const oracledb = require('oracledb');\nconst connection = await oracledb.getConnection({\n  user: "${user}",\n  password: "${maskedPass}",\n  connectString: "${host}:${port || "1521"}/${db}"\n});`,
        python: `import cx_Oracle\nconnection = cx_Oracle.connect(\n    user="${user}",\n    password="${maskedPass}",\n    dsn="${host}:${port || "1521"}/${db}"\n)`,
        jdbc: `jdbc:oracle:thin:@${host}:${port || "1521"}:${db}`
      };
    case "clickhouse":
      return {
        nodejs: `const { createClient } = require('@clickhouse/client');\nconst client = createClient({\n  host: 'http://${host}:${port || "8123"}',\n  username: '${user}',\n  password: '${maskedPass}',\n  database: '${db}'\n});`,
        python: `import clickhouse_connect\nclient = clickhouse_connect.get_client(\n    host='${host}',\n    port=${port || "8123"},\n    username='${user}',\n    password='${maskedPass}',\n    database='${db}'\n)`,
        jdbc: `jdbc:clickhouse://${host}:${port || "8123"}/${db}`
      };
    case "sqlite":
    default:
      return {
        nodejs: `const sqlite3 = require('sqlite3').verbose();\nconst db = new sqlite3.Database('${db}');`,
        python: `import sqlite3\nconn = sqlite3.connect('${db}')`,
        jdbc: `jdbc:sqlite:${db}`
      };
  }
}

export default function DbConnectionStringWorkbenchTool({ manifest }: ToolAppProps) {
  const [kind, setKind] = useState<DbKind>("postgresql");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"builder" | "parser">("builder");

  // Form states for Builder
  const [host, setHost] = useState("db.internal");
  const [port, setPort] = useState("5432");
  const [username, setUsername] = useState("app_user");
  const [password, setPassword] = useState("sec_pwd");
  const [database, setDatabase] = useState("orders_db");
  const [params, setParams] = useState<ParamItem[]>([
    { id: "p1", key: "sslmode", value: "require" },
    { id: "p2", key: "connect_timeout", value: "10" }
  ]);

  // Raw DSN Direct Input State (Parser Mode)
  const [rawDsnInput, setRawDsnInput] = useState(examples.postgresql);

  // Generate unique IDs
  const makeId = () => Math.random().toString(36).slice(2, 9);

  // Re-assemble connection DSN string based on form states
  const generatedDsn = useMemo(() => {
    const qParams = new URLSearchParams();
    params.forEach(p => {
      if (p.key) qParams.append(p.key, p.value);
    });
    const queryStr = qParams.toString();
    const cleanDb = database.trim();
    const cleanHost = host.trim();
    const cleanPort = port.trim();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    const authStr = cleanUser 
      ? `${encodeURIComponent(cleanUser)}${cleanPass ? `:${encodeURIComponent(cleanPass)}` : ""}@` 
      : "";

    switch (kind) {
      case "sqlite":
        return `sqlite://${cleanDb}`;
      case "redis":
        // Redis uses redis://:password@host:port/db
        const redisAuth = cleanPass ? `:${encodeURIComponent(cleanPass)}@` : "";
        return `redis://${redisAuth}${cleanHost}${cleanPort ? `:${cleanPort}` : ""}/${cleanDb || "0"}${queryStr ? `?${queryStr}` : ""}`;
      case "sqlserver":
        return `sqlserver://${authStr}${cleanHost}${cleanPort ? `:${cleanPort}` : ""}/${cleanDb}${queryStr ? `?${queryStr}` : ""}`;
      case "mongodb":
      case "postgresql":
      case "mysql":
      case "oracle":
      case "clickhouse":
      default:
        const portStr = cleanPort ? `:${cleanPort}` : "";
        return `${kind}://${authStr}${cleanHost}${portStr}/${cleanDb}${queryStr ? `?${queryStr}` : ""}`;
    }
  }, [kind, host, port, username, password, database, params]);

  // Parse direct DSN text input
  const handleParseDsnInput = () => {
    if (!rawDsnInput.trim()) {
      setError("请先贴入需要解析的 Dsn 连接串");
      return;
    }
    setError("");
    try {
      const parsed = parseDsn(rawDsnInput, kind);
      setHost(parsed.host);
      setPort(parsed.port);
      setUsername(parsed.username);
      setPassword(parsed.password);
      setDatabase(parsed.database);
      setParams(parsed.params.map(([k, v]) => ({ id: makeId(), key: k, value: v })));
      
      // Auto switch back to builder for visual inspection
      setActiveTab("builder");
    } catch (e) {
      setError(e instanceof Error ? e.message : "连接串解析失败，请检查格式或确保协议正确。");
    }
  };

  // Sync builder's Dsn result to parser input
  useEffect(() => {
    if (activeTab === "builder") {
      setRawDsnInput(generatedDsn);
    }
  }, [generatedDsn, activeTab]);

  // Compute final parsed states for display cards
  const parsedData = useMemo(() => {
    try {
      return parseDsn(rawDsnInput, kind);
    } catch {
      return null;
    }
  }, [rawDsnInput, kind]);

  const snippets = useMemo(() => {
    if (!parsedData) return null;
    return generateCodeSnippets(parsedData, kind);
  }, [parsedData, kind]);

  // Build local environment setup output
  const envOutput = useMemo(() => {
    if (!parsedData) return "";
    const lines = [
      `DB_TYPE=${kind}`,
      `DB_HOST=${parsedData.host}`,
      `DB_PORT=${parsedData.port || (kind === "postgresql" ? "5432" : kind === "mysql" ? "3306" : kind === "redis" ? "6379" : kind === "mongodb" ? "27017" : "")}`,
      `DB_DATABASE=${parsedData.database}`,
      `DB_USERNAME=${parsedData.username}`,
      `DB_PASSWORD=${mask(parsedData.password)}`
    ];
    parsedData.params.forEach(([k, v]) => {
      lines.push(`DB_PARAM_${k.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}=${v}`);
    });
    return lines.join("\n");
  }, [parsedData, kind]);

  const maskedDsn = useMemo(() => {
    if (!parsedData) return "";
    const cleanUser = parsedData.username;
    const cleanPass = parsedData.password;
    const cleanHost = parsedData.host;
    const cleanPort = parsedData.port;
    const cleanDb = parsedData.database;
    
    const paramsStr = parsedData.params.map(([k, v]) => `${k}=${v}`).join("&");
    const queryStr = paramsStr ? `?${paramsStr}` : "";

    const authStr = cleanUser 
      ? `${encodeURIComponent(cleanUser)}${cleanPass ? `:${mask(cleanPass)}` : ""}@` 
      : "";

    if (kind === "sqlite") return `sqlite://${cleanDb}`;
    if (kind === "redis") {
      const redisAuth = cleanPass ? `:${mask(cleanPass)}@` : "";
      return `redis://${redisAuth}${cleanHost}${cleanPort ? `:${cleanPort}` : ""}/${cleanDb || "0"}${queryStr}`;
    }

    return `${kind}://${authStr}${cleanHost}${cleanPort ? `:${cleanPort}` : ""}/${cleanDb}${queryStr}`;
  }, [parsedData, kind]);

  async function copyText(label: string, value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("复制失败，请检查浏览器剪贴板权限");
    }
  }

  // Load example values on DB kind select
  const handleLoadDbExample = (nextKind: DbKind) => {
    setKind(nextKind);
    setError("");
    const dsn = examples[nextKind];
    setRawDsnInput(dsn);
    
    // Perform parsing to update the Builder inputs
    const parsed = parseDsn(dsn, nextKind);
    setHost(parsed.host);
    setPort(parsed.port);
    setUsername(parsed.username);
    setPassword(parsed.password);
    setDatabase(parsed.database);
    setParams(parsed.params.map(([k, v]) => ({ id: makeId(), key: k, value: v })));
  };

  return (
    <section className="tool-panel">
      {/* Visual layouts */}
      <style dangerouslySetInnerHTML={{ __html: `
        .db-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }
        .db-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .db-workspace-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 1024px) {
          .db-workspace-2 {
            grid-template-columns: 1fr 1fr;
          }
        }
        .db-param-row {
          display: grid;
          grid-template-columns: 1fr 1.2fr auto;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          align-items: center;
        }
        .db-param-row input {
          height: 30px;
          padding: 0.35rem 0.5rem;
          font-size: 0.8rem;
        }
        .db-btn-remove {
          background: transparent;
          border: 1px solid var(--border-default);
          color: #ef4444;
          cursor: pointer;
          height: 30px;
          width: 30px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .db-btn-remove:hover {
          background: rgba(239, 68, 68, 0.1);
        }
        .db-code-card {
          background: var(--bg-muted);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 0.75rem;
          position: relative;
        }
        .db-code-copy-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 0.72rem;
          padding: 2px 6px;
        }
      `}} />

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">配置工作台</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "支持多达 8 种主流 SQL/NoSQL 数据库连接串（DSN）的可视化参数配置与双向转换解析，可一键生成多语言客户端配置连接代码与本地 env 环境定义。"}</p>
      </div>

      <div className="segmented-control" style={{ marginBottom: "1.25rem" }}>
        <button type="button" className={activeTab === "builder" ? "active" : ""} onClick={() => { setActiveTab("builder"); setError(""); }}>
          可视化拼装模式 (Builder)
        </button>
        <button type="button" className={activeTab === "parser" ? "active" : ""} onClick={() => { setActiveTab("parser"); setError(""); }}>
          连接串直贴解析模式 (Parser)
        </button>
      </div>

      <div className="db-container">
        {/* PARSER TAB */}
        {activeTab === "parser" && (
          <div className="db-card">
            <div className="tool-toolbar tool-toolbar--grid" style={{ padding: 0, border: "none", margin: 0 }}>
              <label className="tool-field tool-field--compact" style={{ width: "160px" }}>
                <span>数据库解析协议</span>
                <select value={kind} onChange={e => handleLoadDbExample(e.target.value as DbKind)} style={{ height: "36px" }}>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="redis">Redis</option>
                  <option value="mongodb">MongoDB</option>
                  <option value="sqlserver">SQL Server</option>
                  <option value="oracle">Oracle</option>
                  <option value="clickhouse">ClickHouse</option>
                  <option value="sqlite">SQLite</option>
                </select>
              </label>
              <label className="tool-field" style={{ flex: 1, margin: 0 }}>
                <span>输入 Dsn 连接串进行解析</span>
                <input 
                  value={rawDsnInput} 
                  onChange={e => setRawDsnInput(e.target.value)} 
                  placeholder={examples[kind]}
                  style={{ height: "36px" }}
                />
              </label>
              <button 
                type="button" 
                className="button--primary" 
                onClick={handleParseDsnInput}
                style={{ height: "36px", alignSelf: "end", padding: "0 1.5rem" }}
              >
                立即解析并导入表单
              </button>
            </div>
          </div>
        )}

        <div className="db-workspace-2">
          {/* LEFT: Builder inputs configuration */}
          {activeTab === "builder" ? (
            <div className="db-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignSelf: "stretch" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>可视化配置面板</h3>
                <label className="tool-field tool-field--compact" style={{ width: "160px", margin: 0 }}>
                  <select value={kind} onChange={e => handleLoadDbExample(e.target.value as DbKind)} style={{ height: "26px", fontSize: "0.75rem", padding: "0 0.5rem" }}>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="redis">Redis (NoSQL)</option>
                    <option value="mongodb">MongoDB (NoSQL)</option>
                    <option value="sqlserver">SQL Server (MSSQL)</option>
                    <option value="oracle">Oracle Database</option>
                    <option value="clickhouse">ClickHouse OLAP</option>
                    <option value="sqlite">SQLite (嵌入型)</option>
                  </select>
                </label>
              </div>

              {kind === "sqlite" ? (
                <label className="tool-field">
                  <span>SQLite 本地文件物理路径 (Path / Memory)</span>
                  <input value={database} onChange={e => setDatabase(e.target.value)} placeholder="/var/data/app.db 或 :memory:" />
                </label>
              ) : (
                <>
                  <div className="tool-toolbar tool-toolbar--grid" style={{ padding: 0, border: "none", margin: 0 }}>
                    <label className="tool-field tool-field--compact" style={{ flex: 1.4 }}>
                      <span>主机 (Hosts)</span>
                      <input value={host} onChange={e => setHost(e.target.value)} placeholder="localhost" />
                    </label>
                    <label className="tool-field tool-field--compact" style={{ flex: 0.6 }}>
                      <span>端口 (Port)</span>
                      <input value={port} onChange={e => setPort(e.target.value)} placeholder="5432" />
                    </label>
                  </div>

                  <div className="tool-toolbar tool-toolbar--grid" style={{ padding: 0, border: "none", margin: 0 }}>
                    <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                      <span>用户名 (User)</span>
                      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="db_user" />
                    </label>
                    <label className="tool-field tool-field--compact" style={{ flex: 1 }}>
                      <span>密码 (Password)</span>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" />
                    </label>
                  </div>

                  <label className="tool-field">
                    <span>数据库名 (Database / DB Index)</span>
                    <input value={database} onChange={e => setDatabase(e.target.value)} placeholder="production_db" />
                  </label>

                  {/* Connection parameters */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>连接串定制参数 (URL Query Parameters)</span>
                      <button type="button" className="button-link" style={{ fontSize: "0.75rem" }} onClick={() => setParams([...params, { id: makeId(), key: "", value: "" }])}>
                        + 添加参数
                      </button>
                    </div>
                    <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                      {params.map(p => (
                        <div key={p.id} className="db-param-row">
                          <input type="text" placeholder="参数名 (Key)" value={p.key} onChange={e => setParams(params.map(item => item.id === p.id ? { ...item, key: e.target.value } : item))} />
                          <input type="text" placeholder="参数值 (Value)" value={p.value} onChange={e => setParams(params.map(item => item.id === p.id ? { ...item, value: e.target.value } : item))} />
                          <button type="button" className="db-btn-remove" onClick={() => setParams(params.filter(item => item.id !== p.id))}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="db-card" style={{ padding: "2.5rem", justifyContent: "center", alignItems: "center", borderStyle: "dashed" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                当前工作于“连接串直贴解析”模式。请修改上方 DSN 输入框并导入以重设表单。
              </span>
            </div>
          )}

          {/* RIGHT: Results, env generator, and code snippets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Raw DSN and Masked Outputs */}
            <div className="db-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>连接串 DSN 导出</h3>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button type="button" style={{ padding: "0 0.85rem", fontSize: "0.75rem", height: "26px" }} onClick={() => copyText("raw-dsn", generatedDsn)}>
                    {copied === "raw-dsn" ? "已复制" : "复制原始"}
                  </button>
                  <button type="button" style={{ padding: "0 0.85rem", fontSize: "0.75rem", height: "26px" }} onClick={() => copyText("masked-dsn", maskedDsn)}>
                    {copied === "masked-dsn" ? "已复制脱敏" : "复制脱敏"}
                  </button>
                </div>
              </div>
              <textarea 
                value={generatedDsn} 
                readOnly 
                rows={3} 
                style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.8rem", background: "var(--bg-muted)", lineHeight: 1.35 }}
              />
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>🔒 脱敏预览：<code>{maskedDsn}</code></span>
            </div>

            {/* Code snippets & Env vars */}
            <div className="db-card" style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>多环境连接代码生成 (Code Templates)</h3>
              
              {snippets && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div className="db-code-card">
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Node.js 客户端连接</span>
                    <button type="button" className="db-code-copy-btn" onClick={() => copyText("node-code", snippets.nodejs)}>
                      {copied === "node-code" ? "已复制" : "复制"}
                    </button>
                    <pre style={{ margin: 0, fontSize: "0.78rem", overflowX: "auto", fontFamily: "var(--font-mono), monospace" }}><code>{snippets.nodejs}</code></pre>
                  </div>

                  <div className="db-code-card">
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Python 客户端连接</span>
                    <button type="button" className="db-code-copy-btn" onClick={() => copyText("python-code", snippets.python)}>
                      {copied === "python-code" ? "已复制" : "复制"}
                    </button>
                    <pre style={{ margin: 0, fontSize: "0.78rem", overflowX: "auto", fontFamily: "var(--font-mono), monospace" }}><code>{snippets.python}</code></pre>
                  </div>

                  <div className="db-code-card">
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Java JDBC 规范 URL</span>
                    <button type="button" className="db-code-copy-btn" onClick={() => copyText("jdbc-code", snippets.jdbc)}>
                      {copied === "jdbc-code" ? "已复制" : "复制"}
                    </button>
                    <pre style={{ margin: 0, fontSize: "0.78rem", overflowX: "auto", fontFamily: "var(--font-mono), monospace" }}><code>{snippets.jdbc}</code></pre>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)" }}>环境变量配置 (.env)</span>
                  <button type="button" className="button-link" style={{ fontSize: "0.72rem" }} onClick={() => copyText("env-code", envOutput)}>
                    {copied === "env-code" ? "复制 .env 变量" : "复制 .env 变量"}
                  </button>
                </div>
                <textarea 
                  value={envOutput} 
                  readOnly 
                  rows={4} 
                  style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.78rem", background: "var(--bg-muted)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? <p className="tool-error" style={{ marginTop: "1rem" }}>{error}</p> : null}
      <p className="tool-note" style={{ marginTop: "1rem" }}>
        安全声明：所有连接串数据的拼装与反向解析完全在浏览器沙箱本地运行，不会向任何服务器传送机密密码与 IP，确保开发配置的机密安全性。
      </p>
    </section>
  );
}
