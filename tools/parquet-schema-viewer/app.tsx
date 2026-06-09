"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

const sampleSchema = [
  "required group schema {",
  "  optional binary user_id (STRING);",
  "  required int64 event_time (TIMESTAMP_MILLIS);",
  "  optional double amount;",
  "  optional group metadata {",
  "    optional binary source (STRING);",
  "  }",
  "}"
].join("\n");

function parseSchema(input: string): ColumnInfo[] {
  const columns: ColumnInfo[] = [];
  for (const line of input.split(/\r?\n/)) {
    const match = line.trim().match(/^(optional|required|repeated)\s+(binary|int32|int64|double|float|boolean|group|fixed_len_byte_array)(?:\([^)]*\))?\s+([A-Za-z0-9_]+)(?:\s+\(([^)]+)\))?/i);
    if (!match || match[2] === "group") continue;
    columns.push({ name: match[3]!, type: match[4] ? match[2] + " (" + match[4] + ")" : match[2]!, nullable: match[1] !== "required" });
  }
  return columns;
}

export default function ParquetSchemaViewerTool({ manifest }: ToolAppProps) {
  const [schema, setSchema] = useState(sampleSchema);
  const [filter, setFilter] = useState("");
  const columns = useMemo(() => parseSchema(schema), [schema]);
  const filtered = useMemo(() => columns.filter((column) => (column.name + column.type).toLowerCase().includes(filter.toLowerCase())), [columns, filter]);
  const nullableCount = columns.filter((column) => column.nullable).length;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Columnar data</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar"><label className="tool-field tool-field--compact"><span>Filter</span><input value={filter} onChange={(event) => setFilter(event.target.value)} /></label><button type="button" onClick={() => setSchema(sampleSchema)}>Load sample</button></div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>Parquet schema text</span><textarea value={schema} onChange={(event) => setSchema(event.target.value)} spellCheck={false} /></label><div className="detail-card"><h3>Summary</h3><p>{columns.length} columns</p><p>{nullableCount} nullable</p><p>{columns.length - nullableCount} required</p></div></div>
      <div className="detail-grid">{filtered.map((column) => <article className="detail-card" key={column.name}><h3>{column.name}</h3><p>{column.type}</p><p>{column.nullable ? "nullable" : "required"}</p></article>)}</div>
    </section>
  );
}
