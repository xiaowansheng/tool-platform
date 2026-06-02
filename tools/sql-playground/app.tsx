"use client";

import { useEffect, useRef, useState } from "react";

import { WorkerClient } from "@tool-platform/tool-browser-sdk";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

type SqlValue = string | number | boolean | null;

type RuntimeState = "idle" | "loading" | "ready" | "error";
type BusyAction = "initialize-schema" | "initialize-data" | "query" | "clear-db" | "clear-data" | null;
type ActivePanel = "query" | "schema" | "samples" | "graph";
type ReportStage = "success" | "setup" | "query" | "missing-db" | "missing-data" | "cleared";

interface QueryResultSet {
  statementIndex: number;
  columns: string[];
  rows: SqlValue[][];
}

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: SqlValue;
  isPrimaryKey: boolean;
}

interface ForeignKeyInfo {
  id: number;
  seq: number;
  from: string;
  to: string;
  table: string;
  onUpdate: string;
  onDelete: string;
  match: string;
}

interface TableInfo {
  name: string;
  createSql: string;
  rowCount: number;
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
  sampleRows: Array<Record<string, SqlValue>>;
}

interface RelationshipInfo {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

interface SchemaSnapshot {
  tables: TableInfo[];
  relationships: RelationshipInfo[];
}

interface ExecutionReport {
  ok: boolean;
  stage: ReportStage;
  databaseReady: boolean;
  message: string | null;
  setupError: string | null;
  queryError: string | null;
  resultSets: QueryResultSet[];
  schema: SchemaSnapshot | null;
  timings: {
    initMs: number;
    inspectMs: number;
    queryMs: number;
    totalMs: number;
  };
}

const SQL_JS_VERSION = "1.14.1";
const SQL_JS_CDN = `https://cdn.jsdelivr.net/npm/sql.js@${SQL_JS_VERSION}/dist/sql-wasm.js`;
const SQL_WASM_CDN = `https://cdn.jsdelivr.net/npm/sql.js@${SQL_JS_VERSION}/dist/sql-wasm.wasm`;
const QUERY_PREVIEW_LIMIT = 100;
const SAMPLE_ROW_LIMIT = 5;
const EMPTY_TIMINGS = {
  initMs: 0,
  inspectMs: 0,
  queryMs: 0,
  totalMs: 0
};

const demoSchemaSql = `PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  assignee_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  estimate_hours REAL DEFAULT 0
);`;

const demoDataSql = `INSERT INTO users (id, name, email) VALUES
  (1, 'Alice', 'alice@example.com'),
  (2, 'Bob', 'bob@example.com'),
  (3, 'Cara', 'cara@example.com');

INSERT INTO projects (id, name, owner_id, status) VALUES
  (101, 'Internal Tools', 1, 'active'),
  (102, 'Billing Revamp', 2, 'planning');

INSERT INTO tasks (id, project_id, assignee_id, title, status, estimate_hours) VALUES
  (1001, 101, 2, 'Design SQL Playground flow', 'done', 6),
  (1002, 101, 3, 'Implement worker-backed SQLite runtime', 'doing', 12),
  (1003, 102, 1, 'Model invoice edge cases', 'todo', 8),
  (1004, 102, 2, 'Draft migration checklist', 'todo', 4);`;

const demoQuerySql = `SELECT
  p.name AS project_name,
  t.title,
  t.status,
  u.name AS assignee,
  t.estimate_hours
FROM tasks AS t
JOIN projects AS p ON p.id = t.project_id
LEFT JOIN users AS u ON u.id = t.assignee_id
WHERE t.status != 'done'
ORDER BY p.id, t.id;`;

function createWorkerScript() {
  return `
const SQL_JS_URL = ${JSON.stringify(SQL_JS_CDN)};
const SQL_WASM_URL = ${JSON.stringify(SQL_WASM_CDN)};
const SAMPLE_ROW_LIMIT = ${String(SAMPLE_ROW_LIMIT)};

let SQL = null;
let activeDb = null;

function emptyTimings() {
  return {
    initMs: 0,
    inspectMs: 0,
    queryMs: 0,
    totalMs: 0
  };
}

function normalizeValue(value) {
  if (value === undefined) return null;
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : String(value);
  }
  return value;
}

function workerErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function quoteIdentifier(value) {
  return '"' + String(value).replace(/"/g, '""') + '"';
}

function quotePragmaName(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function closeActiveDb() {
  if (!activeDb) {
    return;
  }

  try {
    activeDb.close();
  } catch {}

  activeDb = null;
}

function buildReport(overrides = {}) {
  return {
    ok: true,
    stage: "success",
    databaseReady: activeDb != null,
    message: null,
    setupError: null,
    queryError: null,
    resultSets: [],
    schema: null,
    timings: emptyTimings(),
    ...overrides
  };
}

function listUserTableNames(db) {
  const result = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  )[0];

  return (result?.values ?? []).map((row) => String(row[0] ?? ""));
}

function getSingleValue(db, sql) {
  const result = db.exec(sql);
  return result[0]?.values?.[0]?.[0] ?? 0;
}

function rowsToObjects(result) {
  return result.values.map((row) =>
    Object.fromEntries(result.columns.map((column, index) => [column, normalizeValue(row[index])]))
  );
}

function normalizeExecResults(results) {
  return results.map((result, index) => ({
    statementIndex: index,
    columns: result.columns.map((column) => String(column)),
    rows: result.values.map((row) => row.map(normalizeValue))
  }));
}

function collectSchema(db) {
  const tableQuery = db.exec(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  )[0];
  const tables = [];
  const relationships = [];

  for (const row of tableQuery?.values ?? []) {
    const tableName = String(row[0] ?? "");
    const createSql = String(row[1] ?? "");
    const columnsResult = db.exec(\`PRAGMA table_info(\${quotePragmaName(tableName)})\`)[0];
    const foreignKeysResult = db.exec(\`PRAGMA foreign_key_list(\${quotePragmaName(tableName)})\`)[0];
    const sampleResult = db.exec(\`SELECT * FROM \${quoteIdentifier(tableName)} LIMIT \${SAMPLE_ROW_LIMIT}\`)[0];
    const rowCountValue = getSingleValue(db, \`SELECT COUNT(*) FROM \${quoteIdentifier(tableName)}\`);

    const columns = (columnsResult?.values ?? []).map((columnRow) => ({
      cid: Number(columnRow[0] ?? 0),
      name: String(columnRow[1] ?? ""),
      type: String(columnRow[2] ?? ""),
      notNull: Boolean(columnRow[3]),
      defaultValue: normalizeValue(columnRow[4]),
      isPrimaryKey: Boolean(columnRow[5])
    }));

    const foreignKeys = (foreignKeysResult?.values ?? []).map((fkRow) => {
      const foreignKey = {
        id: Number(fkRow[0] ?? 0),
        seq: Number(fkRow[1] ?? 0),
        table: String(fkRow[2] ?? ""),
        from: String(fkRow[3] ?? ""),
        to: String(fkRow[4] ?? ""),
        onUpdate: String(fkRow[5] ?? ""),
        onDelete: String(fkRow[6] ?? ""),
        match: String(fkRow[7] ?? "")
      };

      relationships.push({
        fromTable: tableName,
        fromColumn: foreignKey.from,
        toTable: foreignKey.table,
        toColumn: foreignKey.to
      });

      return foreignKey;
    });

    tables.push({
      name: tableName,
      createSql,
      rowCount: Number(rowCountValue ?? 0),
      columns,
      foreignKeys,
      sampleRows: sampleResult ? rowsToObjects(sampleResult) : []
    });
  }

  return { tables, relationships };
}

async function ensureSqlJs() {
  if (SQL) {
    return SQL;
  }

  importScripts(SQL_JS_URL);
  SQL = await self.initSqlJs({
    locateFile: (file) => file.endsWith(".wasm") ? SQL_WASM_URL : file
  });
  return SQL;
}

async function initializeSchema(schemaSql) {
  const SqlModule = await ensureSqlJs();
  closeActiveDb();
  activeDb = new SqlModule.Database();
  const totalStart = performance.now();
  const report = buildReport({
    databaseReady: true,
    message: "数据库表结构已初始化，可继续执行初始化数据或查询。"
  });

  try {
    activeDb.run("PRAGMA foreign_keys = ON;");

    const initStart = performance.now();
    if (String(schemaSql ?? "").trim()) {
      activeDb.run(String(schemaSql));
    }
    report.timings.initMs = performance.now() - initStart;

    const inspectStart = performance.now();
    report.schema = collectSchema(activeDb);
    report.timings.inspectMs = performance.now() - inspectStart;
  } catch (error) {
    closeActiveDb();
    report.ok = false;
    report.stage = "setup";
    report.databaseReady = false;
    report.message = null;
    report.schema = null;
    report.setupError = workerErrorMessage(error);
  }

  report.timings.totalMs = performance.now() - totalStart;
  return report;
}

function initializeData(dataSql) {
  if (!activeDb) {
    return buildReport({
      ok: false,
      stage: "missing-db",
      databaseReady: false,
      message: "当前还没有初始化数据库表结构，请先执行最上方的表脚本。"
    });
  }

  const totalStart = performance.now();
  const report = buildReport({
    databaseReady: true,
    message: "初始化数据已写入当前数据库。"
  });

  try {
    const initStart = performance.now();
    if (String(dataSql ?? "").trim()) {
      activeDb.run(String(dataSql));
    }
    report.timings.initMs = performance.now() - initStart;

    const inspectStart = performance.now();
    report.schema = collectSchema(activeDb);
    report.timings.inspectMs = performance.now() - inspectStart;
  } catch (error) {
    report.ok = false;
    report.stage = "setup";
    report.message = null;
    report.setupError = workerErrorMessage(error);
    report.schema = collectSchema(activeDb);
  }

  report.timings.totalMs = performance.now() - totalStart;
  return report;
}

function clearAllData() {
  if (!activeDb) {
    return buildReport({
      ok: false,
      stage: "missing-db",
      databaseReady: false,
      message: "当前还没有可清除的数据，请先初始化数据库表结构。"
    });
  }

  const totalStart = performance.now();
  const report = buildReport({
    databaseReady: true,
    message: "当前数据库中的数据已清除，表结构已保留。"
  });

  try {
    const initStart = performance.now();
    const tableNames = listUserTableNames(activeDb).reverse();

    activeDb.run("PRAGMA foreign_keys = OFF;");
    activeDb.run("BEGIN;");

    try {
      for (const tableName of tableNames) {
        activeDb.run(\`DELETE FROM \${quoteIdentifier(tableName)};\`);
      }

      try {
        activeDb.run("DELETE FROM sqlite_sequence;");
      } catch {}

      activeDb.run("COMMIT;");
    } catch (error) {
      try {
        activeDb.run("ROLLBACK;");
      } catch {}
      throw error;
    } finally {
      activeDb.run("PRAGMA foreign_keys = ON;");
    }

    report.timings.initMs = performance.now() - initStart;

    const inspectStart = performance.now();
    report.schema = collectSchema(activeDb);
    report.timings.inspectMs = performance.now() - inspectStart;
  } catch (error) {
    report.ok = false;
    report.stage = "setup";
    report.message = null;
    report.setupError = workerErrorMessage(error);
    report.schema = collectSchema(activeDb);
  }

  report.timings.totalMs = performance.now() - totalStart;
  return report;
}

function clearDatabase() {
  closeActiveDb();
  return buildReport({
    stage: "cleared",
    databaseReady: false,
    message: "数据库已清除。"
  });
}

function runQuery(querySql) {
  if (!activeDb) {
    return buildReport({
      ok: false,
      stage: "missing-db",
      databaseReady: false,
      message: "当前还没有初始化数据库，请先执行表结构脚本和初始化数据。"
    });
  }

  const totalStart = performance.now();
  const report = buildReport({
    databaseReady: true,
    message: "查询已在当前数据库上执行。"
  });

  try {
    const queryStart = performance.now();
    report.resultSets = normalizeExecResults(activeDb.exec(String(querySql)));
    report.timings.queryMs = performance.now() - queryStart;

    const inspectStart = performance.now();
    report.schema = collectSchema(activeDb);
    report.timings.inspectMs = performance.now() - inspectStart;

    if (report.resultSets.length === 0) {
      report.message = "当前语句执行成功，但没有返回结果集。";
    }
  } catch (error) {
    report.ok = false;
    report.stage = "query";
    report.queryError = workerErrorMessage(error);
    report.message = null;
    report.schema = collectSchema(activeDb);
  }

  report.timings.totalMs = performance.now() - totalStart;
  return report;
}

self.onmessage = async function (event) {
  const msg = event.data;

  if (!msg || msg.kind !== "call") {
    return;
  }

  try {
    if (msg.action === "initializeSchema") {
      const report = await initializeSchema(msg.payload.schemaSql);
      self.postMessage({
        id: msg.id,
        kind: "response",
        success: true,
        data: report
      });
      return;
    }

    if (msg.action === "initializeData") {
      const report = initializeData(msg.payload.dataSql);
      self.postMessage({
        id: msg.id,
        kind: "response",
        success: true,
        data: report
      });
      return;
    }

    if (msg.action === "clearData") {
      const report = clearAllData();
      self.postMessage({
        id: msg.id,
        kind: "response",
        success: true,
        data: report
      });
      return;
    }

    if (msg.action === "clearDatabase") {
      const report = clearDatabase();
      self.postMessage({
        id: msg.id,
        kind: "response",
        success: true,
        data: report
      });
      return;
    }

    if (msg.action === "query") {
      const report = runQuery(String(msg.payload.querySql ?? ""));
      self.postMessage({
        id: msg.id,
        kind: "response",
        success: true,
        data: report
      });
      return;
    }

    throw new Error("Unknown action: " + msg.action);
  } catch (error) {
    self.postMessage({
      id: msg.id,
      kind: "response",
      success: false,
      error: workerErrorMessage(error)
    });
  }
};
`;
}

function createWorkerFromScript() {
  const blob = new Blob([createWorkerScript()], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}

function runtimeLabel(state: RuntimeState) {
  if (state === "ready") return "SQLite/WASM 已就绪";
  if (state === "loading") return "运行时加载中";
  if (state === "error") return "运行时加载失败";
  return "等待首次初始化";
}

function formatDuration(value: number) {
  return `${value.toFixed(value < 10 ? 2 : 1)} ms`;
}

function formatCell(value: SqlValue) {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function toCopyPayload(resultSets: QueryResultSet[]) {
  return resultSets.map((set) => ({
    statementIndex: set.statementIndex,
    rows: set.rows.map((row) => Object.fromEntries(set.columns.map((column, index) => [column, row[index] ?? null])))
  }));
}

function buildGraphLayout(schema: SchemaSnapshot) {
  const cardWidth = 280;
  const cardHeaderHeight = 58;
  const cardFooterHeight = 30;
  const fieldRowHeight = 18;
  const cardGapX = 52;
  const cardGapY = 38;
  const paddingX = 24;
  const paddingY = 24;
  const columnCount = schema.tables.length > 3 ? 2 : 1;
  const items: Array<{
    table: TableInfo;
    x: number;
    y: number;
    width: number;
    height: number;
    fieldNames: string[];
  }> = [];

  const rowHeights: number[] = [];

  for (let index = 0; index < schema.tables.length; index += 1) {
    const table = schema.tables[index];
    const row = Math.floor(index / columnCount);
    const fieldNames = table.columns.map((column) => column.name);
    const visibleFieldCount = Math.max(1, Math.min(fieldNames.length, 8));
    const height = cardHeaderHeight + cardFooterHeight + visibleFieldCount * fieldRowHeight + (fieldNames.length > 8 ? fieldRowHeight : 0);
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, height);
  }

  let currentY = paddingY;

  for (let row = 0; row < rowHeights.length; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      const index = row * columnCount + column;
      const table = schema.tables[index];

      if (!table) {
        continue;
      }

      items.push({
        table,
        x: paddingX + column * (cardWidth + cardGapX),
        y: currentY,
        width: cardWidth,
        height: rowHeights[row] ?? 0,
        fieldNames: table.columns.map((columnInfo) => columnInfo.name)
      });
    }

    currentY += (rowHeights[row] ?? 0) + cardGapY;
  }

  const itemMap = new Map(items.map((item) => [item.table.name, item]));

  const connections = schema.relationships
    .map((relationship) => {
      const from = itemMap.get(relationship.fromTable);
      const to = itemMap.get(relationship.toTable);

      if (!from || !to) {
        return null;
      }

      const fromIndex = Math.max(0, from.fieldNames.indexOf(relationship.fromColumn));
      const toIndex = Math.max(0, to.fieldNames.indexOf(relationship.toColumn));
      const fromY = from.y + cardHeaderHeight + (Math.min(fromIndex, 7) + 0.5) * fieldRowHeight;
      const toY = to.y + cardHeaderHeight + (Math.min(toIndex, 7) + 0.5) * fieldRowHeight;
      const leftToRight = from.x <= to.x;
      const startX = leftToRight ? from.x + from.width : from.x;
      const endX = leftToRight ? to.x : to.x + to.width;
      const midX = (startX + endX) / 2;

      return {
        key: `${relationship.fromTable}.${relationship.fromColumn}-${relationship.toTable}.${relationship.toColumn}`,
        path: `M ${startX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${endX} ${toY}`,
        label: `${relationship.fromTable}.${relationship.fromColumn} -> ${relationship.toTable}.${relationship.toColumn}`
      };
    })
    .filter((item): item is { key: string; path: string; label: string } => item !== null);

  const width = paddingX * 2 + columnCount * cardWidth + Math.max(0, columnCount - 1) * cardGapX;
  const height = Math.max(220, currentY - cardGapY + paddingY);

  return { width, height, items, connections, cardHeaderHeight, fieldRowHeight };
}

function renderRuntimeStatus(state: RuntimeState) {
  return (
    <span className={`status-label ${state === "ready" ? "status-label--on" : "status-label--off"}`}>
      {runtimeLabel(state)}
    </span>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export default function SqlPlaygroundTool({ manifest }: ToolAppProps) {
  const [schemaSql, setSchemaSql] = useState(demoSchemaSql);
  const [dataSql, setDataSql] = useState(demoDataSql);
  const [querySql, setQuerySql] = useState(demoQuerySql);
  const [report, setReport] = useState<ExecutionReport | null>(null);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("idle");
  const [engineError, setEngineError] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>("query");
  const [copyLabel, setCopyLabel] = useState("复制结果");
  const clientRef = useRef<WorkerClient | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => {
    clientRef.current?.dispose();
    workerRef.current?.terminate();
    clientRef.current = null;
    workerRef.current = null;
  }, []);

  function ensureClient() {
    if (clientRef.current) {
      return clientRef.current;
    }

    const worker = createWorkerFromScript();
    workerRef.current = worker;
    clientRef.current = new WorkerClient(worker);
    return clientRef.current;
  }

  async function runWorkerAction<TPayload>(action: "initializeSchema" | "initializeData" | "clearData" | "clearDatabase" | "query", payload: TPayload, nextBusyAction: BusyAction) {
    setBusyAction(nextBusyAction);
    setEngineError("");
    setRuntimeState((state) => state === "ready" ? state : "loading");

    try {
      const client = ensureClient();
      const nextReport = await client.call<ExecutionReport, TPayload>(action, payload);
      setReport(nextReport);
      setRuntimeState("ready");
      setCopyLabel("复制结果");
      return nextReport;
    } catch (error) {
      setRuntimeState("error");
      setEngineError(error instanceof Error ? error.message : String(error));
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function initializeSchema() {
    const nextReport = await runWorkerAction("initializeSchema", { schemaSql }, "initialize-schema");
    setActivePanel(nextReport?.ok ? "schema" : "query");
  }

  async function initializeData() {
    if (!databaseReady) {
      setReport({
        ok: false,
        stage: "missing-db",
        databaseReady: false,
        message: "当前还没有初始化数据库表结构，请先执行最上方的表脚本。",
        setupError: null,
        queryError: null,
        resultSets: [],
        schema: report?.schema ?? null,
        timings: report?.timings ?? EMPTY_TIMINGS
      });
      setActivePanel("query");
      return;
    }

    const nextReport = await runWorkerAction("initializeData", { dataSql }, "initialize-data");
    setActivePanel(nextReport?.ok ? "samples" : "query");
  }

  async function clearData() {
    if (!databaseReady) {
      setReport({
        ok: false,
        stage: "missing-db",
        databaseReady: false,
        message: "当前还没有数据库可清除数据，请先初始化数据库表结构。",
        setupError: null,
        queryError: null,
        resultSets: [],
        schema: report?.schema ?? null,
        timings: report?.timings ?? EMPTY_TIMINGS
      });
      setActivePanel("query");
      return;
    }

    const nextReport = await runWorkerAction("clearData", {}, "clear-data");
    setActivePanel(nextReport?.ok ? "samples" : "query");
  }

  async function clearDatabase() {
    const nextReport = await runWorkerAction("clearDatabase", {}, "clear-db");
    if (nextReport) {
      setActivePanel("query");
    }
  }

  async function executeQuery() {
    if (!databaseReady) {
      setReport({
        ok: false,
        stage: "missing-db",
        databaseReady: false,
        message: "当前还没有初始化数据库，请先执行最上方的表结构脚本。",
        setupError: null,
        queryError: null,
        resultSets: [],
        schema: report?.schema ?? null,
        timings: report?.timings ?? EMPTY_TIMINGS
      });
      setActivePanel("query");
      return;
    }

    if (!hasInitializedData) {
      setReport({
        ok: false,
        stage: "missing-data",
        databaseReady: true,
        message: "当前数据库还没有初始化数据，请先执行“初始化数据”，否则查询通常找不到记录。",
        setupError: null,
        queryError: null,
        resultSets: [],
        schema: report?.schema ?? null,
        timings: report?.timings ?? EMPTY_TIMINGS
      });
      setActivePanel("query");
      return;
    }

    const nextReport = await runWorkerAction("query", { querySql }, "query");
    if (nextReport) {
      setActivePanel("query");
    }
  }

  function loadDemo() {
    setSchemaSql(demoSchemaSql);
    setDataSql(demoDataSql);
    setQuerySql(demoQuerySql);
  }

  function clearEditors() {
    setSchemaSql("");
    setDataSql("");
    setQuerySql("");
    setCopyLabel("复制结果");
  }

  async function copyResults() {
    if (!report?.resultSets.length) {
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(toCopyPayload(report.resultSets), null, 2));
      setCopyLabel("已复制");
      window.setTimeout(() => setCopyLabel("复制结果"), 2000);
    } catch {
      setCopyLabel("复制失败");
      window.setTimeout(() => setCopyLabel("复制结果"), 2000);
    }
  }

  const databaseReady = report?.databaseReady ?? false;
  const tableCount = report?.schema?.tables.length ?? 0;
  const totalRowCount = report?.schema?.tables.reduce((sum, table) => sum + table.rowCount, 0) ?? 0;
  const hasInitializedData = totalRowCount > 0;
  const relationCount = report?.schema?.relationships.length ?? 0;
  const queryResultCount = report?.resultSets.reduce((sum, resultSet) => sum + resultSet.rows.length, 0) ?? 0;
  const graphLayout = report?.schema ? buildGraphLayout(report.schema) : null;
  const hasResults = (report?.resultSets.length ?? 0) > 0;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">数据库工具 · SQLite/WASM</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>运行时</h3>
          <p>{SQL_JS_VERSION}</p>
        </article>
        <article className="detail-card">
          <h3>数据库</h3>
          <p>{databaseReady ? "已初始化" : "未初始化"}</p>
        </article>
        <article className="detail-card">
          <h3>数据表</h3>
          <p>{tableCount}</p>
        </article>
        <article className="detail-card">
          <h3>数据</h3>
          <p>{hasInitializedData ? `${totalRowCount} 行` : "未初始化"}</p>
        </article>
        <article className="detail-card">
          <h3>关系线</h3>
          <p>{relationCount}</p>
        </article>
      </div>

      <div className="workspace workspace--stack">
        <div className="workspace workspace--stack">
          <div className="tool-toolbar">
            <button type="button" className="button--primary" onClick={() => void initializeSchema()} disabled={busyAction !== null}>
              {busyAction === "initialize-schema" ? "初始化中..." : databaseReady ? "重新初始化数据库表" : "初始化数据库表"}
            </button>
            <button type="button" className="button--danger" onClick={() => void clearDatabase()} disabled={busyAction !== null || !databaseReady}>
              {busyAction === "clear-db" ? "清除中..." : "清除数据库"}
            </button>
            <button type="button" onClick={loadDemo} disabled={busyAction !== null}>载入示例</button>
            <button type="button" onClick={clearEditors} disabled={busyAction !== null}>清空编辑区</button>
            {renderRuntimeStatus(runtimeState)}
          </div>
          <label className="tool-field">
            <span>初始化数据库表脚本</span>
            <textarea
              value={schemaSql}
              onChange={(event) => setSchemaSql(event.target.value)}
              spellCheck={false}
              placeholder="CREATE TABLE ...; ALTER TABLE ...;"
            />
          </label>
        </div>

        <div className="workspace workspace--stack">
          <div className="tool-toolbar">
            <button type="button" className="button--primary" onClick={() => void initializeData()} disabled={busyAction !== null || !databaseReady}>
              {busyAction === "initialize-data" ? "写入中..." : "初始化数据"}
            </button>
            <button type="button" className="button--danger" onClick={() => void clearData()} disabled={busyAction !== null || !databaseReady || !hasInitializedData}>
              {busyAction === "clear-data" ? "清除中..." : "清除数据"}
            </button>
          </div>
          <label className="tool-field">
            <span>初始化数据内容</span>
            <textarea
              value={dataSql}
              onChange={(event) => setDataSql(event.target.value)}
              spellCheck={false}
              placeholder="INSERT INTO ...; UPDATE ...;"
            />
          </label>
          {!databaseReady ? <p className="tool-note">请先初始化数据库表结构，再执行初始化数据。</p> : null}
          {databaseReady && !hasInitializedData ? <p className="tool-note">当前数据库还没有初始化数据。先执行“初始化数据”，避免查询时找不到记录。</p> : null}
          {hasInitializedData ? <p className="tool-note">当前数据库已包含 {totalRowCount} 行数据，可继续查询或清除数据。</p> : null}
        </div>

        <div className="workspace workspace--stack">
          <div className="tool-toolbar">
            <button type="button" className="button--primary" onClick={() => void executeQuery()} disabled={busyAction !== null || !querySql.trim() || !databaseReady || !hasInitializedData}>
              {busyAction === "query" ? "查询中..." : "执行查询"}
            </button>
            <button type="button" onClick={() => void copyResults()} disabled={!hasResults}>{copyLabel}</button>
          </div>
          <label className="tool-field">
            <span>查询 SQL</span>
            <textarea
              value={querySql}
              onChange={(event) => setQuerySql(event.target.value)}
              spellCheck={false}
              placeholder="SELECT * FROM your_table;"
            />
          </label>
          {!databaseReady ? <p className="tool-note">请先初始化数据库表结构，否则不能执行查询。</p> : null}
          {databaseReady && !hasInitializedData ? <p className="tool-note">当前数据库没有初始化数据，查询按钮已禁用。请先执行“初始化数据”。</p> : null}
        </div>
      </div>

      <div className="tool-toolbar">
        <button type="button" className={activePanel === "query" ? "button--primary" : undefined} onClick={() => setActivePanel("query")}>查询结果</button>
        <button type="button" className={activePanel === "schema" ? "button--primary" : undefined} onClick={() => setActivePanel("schema")}>Schema</button>
        <button type="button" className={activePanel === "samples" ? "button--primary" : undefined} onClick={() => setActivePanel("samples")}>样例数据</button>
        <button type="button" className={activePanel === "graph" ? "button--primary" : undefined} onClick={() => setActivePanel("graph")}>关系图</button>
      </div>

      {activePanel === "query" ? (
        <div className="workspace workspace--stack">
          <div className="detail-grid">
            <article className="detail-card">
              <h3>初始化耗时</h3>
              <p>{formatDuration(report?.timings.initMs ?? 0)}</p>
            </article>
            <article className="detail-card">
              <h3>Schema 刷新</h3>
              <p>{formatDuration(report?.timings.inspectMs ?? 0)}</p>
            </article>
            <article className="detail-card">
              <h3>查询耗时</h3>
              <p>{formatDuration(report?.timings.queryMs ?? 0)}</p>
            </article>
            <article className="detail-card">
              <h3>结果行</h3>
              <p>{queryResultCount}</p>
            </article>
          </div>

          {report?.setupError ? <p className="tool-error">初始化失败：{report.setupError}</p> : null}
          {report?.queryError ? <p className="tool-error">查询 SQL 失败：{report.queryError}</p> : null}
          {report?.message && report.stage !== "success" ? <p className={report.stage === "missing-db" || report.stage === "missing-data" ? "tool-error" : "tool-note"}>{report.message}</p> : null}
          {report?.message && report.stage === "success" ? <p className="tool-note">{report.message}</p> : null}

          {!databaseReady ? (
            <EmptyState title="数据库未初始化" description="先执行最上方的表结构脚本，再按需执行初始化数据。最下方结果区只会展示当前数据库的状态。" />
          ) : hasResults ? report?.resultSets.map((resultSet) => {
            const previewRows = resultSet.rows.slice(0, QUERY_PREVIEW_LIMIT);
            const gridTemplateColumns = `repeat(${Math.max(1, resultSet.columns.length)}, minmax(9rem, 1fr))`;

            return (
              <div key={`result-set-${resultSet.statementIndex}`} className="workspace workspace--stack">
                <article className="detail-card" style={{ textAlign: "left" }}>
                  <h3>结果集 #{resultSet.statementIndex + 1}</h3>
                  <p style={{ marginTop: "0.5rem", fontSize: "0.92rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                    {resultSet.rows.length} 行，{resultSet.columns.length} 列
                  </p>
                </article>
                <div className="tool-table">
                  <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns }}>
                    {resultSet.columns.map((column) => <span key={column}>{column}</span>)}
                  </div>
                  {previewRows.map((row, rowIndex) => (
                    <div key={`row-${resultSet.statementIndex}-${rowIndex}`} className="tool-table__row" style={{ gridTemplateColumns }}>
                      {row.map((value, columnIndex) => <span key={`${resultSet.columns[columnIndex]}-${rowIndex}`}>{formatCell(value)}</span>)}
                    </div>
                  ))}
                </div>
                {resultSet.rows.length > QUERY_PREVIEW_LIMIT ? (
                  <p className="tool-note">结果集较大，当前只显示前 {QUERY_PREVIEW_LIMIT} 行。</p>
                ) : null}
              </div>
            );
          }) : (
            <EmptyState title="当前没有查询结果" description="数据库已经初始化。现在可以在上方继续写入数据，或者在查询区执行 SELECT / UPDATE / JOIN 语句。Schema 和样例数据会始终反映当前数据库状态。" />
          )}
        </div>
      ) : null}

      {activePanel === "schema" ? (
        report?.schema?.tables.length ? (
          <div className="workspace workspace--stack">
            {report.schema.tables.map((table) => (
              <div key={table.name} className="workspace workspace--stack">
                <article className="detail-card" style={{ textAlign: "left" }}>
                  <h3>{table.name}</h3>
                  <p style={{ marginTop: "0.45rem", fontSize: "0.9rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                    {table.rowCount} 行 · {table.columns.length} 字段 · {table.foreignKeys.length} 个外键
                  </p>
                </article>
                <div className="tool-table">
                  <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "minmax(10rem, 1fr) minmax(7rem, 0.7fr) minmax(5rem, 0.45fr) minmax(7rem, 0.6fr) minmax(0, 1fr)" }}>
                    <span>字段</span>
                    <span>类型</span>
                    <span>主键</span>
                    <span>非空</span>
                    <span>默认值</span>
                  </div>
                  {table.columns.map((column) => (
                    <div key={`${table.name}-${column.name}`} className="tool-table__row" style={{ gridTemplateColumns: "minmax(10rem, 1fr) minmax(7rem, 0.7fr) minmax(5rem, 0.45fr) minmax(7rem, 0.6fr) minmax(0, 1fr)" }}>
                      <span>{column.name}</span>
                      <span>{column.type || "TEXT"}</span>
                      <span>{column.isPrimaryKey ? "YES" : "-"}</span>
                      <span>{column.notNull ? "YES" : "-"}</span>
                      <span>{formatCell(column.defaultValue)}</span>
                    </div>
                  ))}
                </div>
                <label className="tool-field">
                  <span>建表 SQL</span>
                  <textarea value={table.createSql} readOnly spellCheck={false} />
                </label>
                {table.foreignKeys.length > 0 ? (
                  <div className="tool-table">
                    <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "minmax(9rem, 0.9fr) minmax(7rem, 0.7fr) minmax(9rem, 0.9fr) minmax(7rem, 0.7fr) minmax(0, 1fr)" }}>
                      <span>来源表</span>
                      <span>来源列</span>
                      <span>目标表</span>
                      <span>目标列</span>
                      <span>删除 / 更新</span>
                    </div>
                    {table.foreignKeys.map((foreignKey) => (
                      <div key={`${table.name}-${foreignKey.id}-${foreignKey.seq}`} className="tool-table__row" style={{ gridTemplateColumns: "minmax(9rem, 0.9fr) minmax(7rem, 0.7fr) minmax(9rem, 0.9fr) minmax(7rem, 0.7fr) minmax(0, 1fr)" }}>
                        <span>{table.name}</span>
                        <span>{foreignKey.from}</span>
                        <span>{foreignKey.table}</span>
                        <span>{foreignKey.to}</span>
                        <span>{foreignKey.onDelete}/{foreignKey.onUpdate}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="没有可展示的 Schema" description="数据库表结构初始化成功后，这里会自动列出当前数据库的表、字段、类型和外键。" />
        )
      ) : null}

      {activePanel === "samples" ? (
        report?.schema?.tables.length ? (
          <div className="workspace workspace--stack">
            {report.schema.tables.map((table) => {
              const columns = table.columns.map((column) => column.name);
              const gridTemplateColumns = `repeat(${Math.max(1, columns.length)}, minmax(8rem, 1fr))`;

              return (
                <div key={`sample-${table.name}`} className="workspace workspace--stack">
                  <article className="detail-card" style={{ textAlign: "left" }}>
                    <h3>{table.name}</h3>
                    <p style={{ marginTop: "0.45rem", fontSize: "0.9rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                      预览前 {Math.min(SAMPLE_ROW_LIMIT, table.sampleRows.length)} 行，共 {table.rowCount} 行
                    </p>
                  </article>
                  {table.sampleRows.length > 0 ? (
                    <div className="tool-table">
                      <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns }}>
                        {columns.map((column) => <span key={`${table.name}-${column}`}>{column}</span>)}
                      </div>
                      {table.sampleRows.map((row, rowIndex) => (
                        <div key={`${table.name}-row-${rowIndex}`} className="tool-table__row" style={{ gridTemplateColumns }}>
                          {columns.map((column) => <span key={`${table.name}-${rowIndex}-${column}`}>{formatCell(row[column] ?? null)}</span>)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title={`${table.name} 暂无数据`} description="这张表已经创建成功，但当前数据库里还没有样例数据。" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="等待样例数据" description="数据库初始化成功后，这里会自动按表展示前几行样例数据。" />
        )
      ) : null}

      {activePanel === "graph" ? (
        graphLayout && report?.schema ? (
          <div className="workspace workspace--stack">
            <div className="visual-preview" style={{ overflow: "auto", padding: "1rem" }}>
              <svg viewBox={`0 0 ${graphLayout.width} ${graphLayout.height}`} role="img" aria-label="数据库表关系图" style={{ width: "100%", minWidth: `${graphLayout.width}px`, minHeight: `${graphLayout.height}px` }}>
                <defs>
                  <linearGradient id="sql-playground-card" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(56, 189, 248, 0.14)" />
                    <stop offset="100%" stopColor="rgba(16, 185, 129, 0.08)" />
                  </linearGradient>
                </defs>
                {graphLayout.connections.map((connection) => (
                  <path
                    key={connection.key}
                    d={connection.path}
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.72)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    opacity="0.92"
                  >
                    <title>{connection.label}</title>
                  </path>
                ))}
                {graphLayout.items.map((item) => {
                  const visibleColumns = item.table.columns.slice(0, 8);
                  const hiddenCount = item.table.columns.length - visibleColumns.length;

                  return (
                    <g key={`graph-${item.table.name}`}>
                      <rect
                        x={item.x}
                        y={item.y}
                        width={item.width}
                        height={item.height}
                        rx="18"
                        fill="url(#sql-playground-card)"
                        stroke="rgba(148, 163, 184, 0.32)"
                        strokeWidth="1.2"
                      />
                      <text x={item.x + 18} y={item.y + 26} fontSize="16" fontWeight="700" fill="currentColor">
                        {item.table.name}
                      </text>
                      <text x={item.x + 18} y={item.y + 44} fontSize="11" fill="rgba(148, 163, 184, 0.95)">
                        {item.table.rowCount} rows · {item.table.foreignKeys.length} foreign keys
                      </text>
                      {visibleColumns.map((column, index) => (
                        <text
                          key={`${item.table.name}-${column.name}`}
                          x={item.x + 18}
                          y={item.y + graphLayout.cardHeaderHeight + 14 + index * graphLayout.fieldRowHeight}
                          fontSize="12"
                          fill="currentColor"
                        >
                          {truncate(`${column.name}: ${column.type || "TEXT"}`, 34)}
                        </text>
                      ))}
                      {hiddenCount > 0 ? (
                        <text
                          x={item.x + 18}
                          y={item.y + graphLayout.cardHeaderHeight + 14 + visibleColumns.length * graphLayout.fieldRowHeight}
                          fontSize="12"
                          fill="rgba(148, 163, 184, 0.95)"
                        >
                          +{hiddenCount} more fields
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="tool-table">
              <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "minmax(10rem, 1fr) minmax(8rem, 0.8fr) minmax(10rem, 1fr) minmax(8rem, 0.8fr)" }}>
                <span>来源表</span>
                <span>来源列</span>
                <span>目标表</span>
                <span>目标列</span>
              </div>
              {report.schema.relationships.map((relationship) => (
                <div key={`${relationship.fromTable}-${relationship.fromColumn}-${relationship.toTable}-${relationship.toColumn}`} className="tool-table__row" style={{ gridTemplateColumns: "minmax(10rem, 1fr) minmax(8rem, 0.8fr) minmax(10rem, 1fr) minmax(8rem, 0.8fr)" }}>
                  <span>{relationship.fromTable}</span>
                  <span>{relationship.fromColumn}</span>
                  <span>{relationship.toTable}</span>
                  <span>{relationship.toColumn}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="暂无关系图" description="数据库初始化成功后，这里会生成表卡片、字段摘要和关系线。" />
        )
      ) : null}

      <p className="tool-note">
        当前工具会明确区分“数据库是否已初始化”和“是否已有初始化数据”。没有数据库时会阻止初始化数据和查询；没有数据时也会提示并阻止查询，避免在空状态下查不到记录。
      </p>
      {engineError ? <p className="tool-error">运行时错误：{engineError}</p> : null}
    </section>
  );
}
