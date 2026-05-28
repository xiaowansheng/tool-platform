"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type OutputFormat = "json" | "ndjson" | "csv";

interface FieldSpec {
  name: string;
  type: string;
}

const firstNames = ["Ada", "Grace", "Linus", "Margaret", "Alan", "Katherine", "Barbara", "Donald", "Edsger", "Radia"];
const lastNames = ["Lovelace", "Hopper", "Torvalds", "Hamilton", "Turing", "Johnson", "Liskov", "Knuth", "Dijkstra", "Perlman"];
const companies = ["Northstar Labs", "Clearbit Works", "Orbital Systems", "Delta Forge", "Signal Harbor", "Vector Field"];
const cities = ["Austin", "Seattle", "Boston", "Denver", "Portland", "Chicago", "Atlanta", "Raleigh"];
const words = ["atlas", "beacon", "canvas", "delta", "ember", "flux", "grove", "harbor", "ion", "junction"];
const statuses = ["active", "pending", "paused", "archived"];

const defaultSchema = `id: uuid
name: fullName
email: email
company: company
city: city
score: integer
active: boolean
createdAt: date`;

function hashSeed(seed: string) {
  let value = 2166136261;

  for (const character of seed) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}

function createRandom(seed: number) {
  let value = seed;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: T[], random: () => number) {
  return items[Math.floor(random() * items.length)];
}

function parseSchema(input: string): FieldSpec[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.includes(":") ? ":" : ",";
      const [name, type] = line.split(separator).map((part) => part.trim());
      return { name, type: type || "word" };
    })
    .filter((field) => field.name);
}

function uuid(random: () => number) {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const value = Math.floor(random() * 16);
    return (character === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}

function valueFor(type: string, index: number, random: () => number) {
  const firstName = pick(firstNames, random);
  const lastName = pick(lastNames, random);

  if (type === "uuid") return uuid(random);
  if (type === "id") return index + 1;
  if (type === "firstName") return firstName;
  if (type === "lastName") return lastName;
  if (type === "fullName" || type === "name") return `${firstName} ${lastName}`;
  if (type === "email") return `${firstName}.${lastName}.${index + 1}@example.test`.toLowerCase();
  if (type === "company") return pick(companies, random);
  if (type === "city") return pick(cities, random);
  if (type === "integer" || type === "number") return Math.floor(random() * 1000);
  if (type === "score") return Math.floor(60 + random() * 40);
  if (type === "boolean") return random() > 0.5;
  if (type === "date") return new Date(Date.UTC(2026, 0, 1 + Math.floor(random() * 180))).toISOString();
  if (type === "url") return `https://example.test/${pick(words, random)}/${index + 1}`;
  if (type === "status") return pick(statuses, random);
  if (type === "sentence") return `${pick(words, random)} ${pick(words, random)} ${pick(words, random)}.`;
  return pick(words, random);
}

function generateRows(schema: string, count: number, seed: string) {
  const fields = parseSchema(schema);
  const random = createRandom(hashSeed(seed));

  return Array.from({ length: count }, (_, index) => Object.fromEntries(
    fields.map((field) => [field.name, valueFor(field.type, index, random)])
  ));
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function formatRows(rows: Array<Record<string, unknown>>, format: OutputFormat) {
  if (format === "json") {
    return JSON.stringify(rows, null, 2);
  }

  if (format === "ndjson") {
    return rows.map((row) => JSON.stringify(row)).join("\n");
  }

  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(","))].join("\n");
}

export default function MockDataGeneratorTool({ manifest }: ToolClientProps) {
  const [schema, setSchema] = useState(defaultSchema);
  const [count, setCount] = useState(12);
  const [seed, setSeed] = useState("tool-platform");
  const [format, setFormat] = useState<OutputFormat>("json");
  const rows = useMemo(() => generateRows(schema, Math.max(1, Math.min(500, count)), seed), [count, schema, seed]);
  const output = useMemo(() => formatRows(rows, format), [format, rows]);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Synthetic Data</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>行数</span>
          <input type="number" min="1" max="500" value={count} onChange={(event) => setCount(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>Seed</span>
          <input value={seed} onChange={(event) => setSeed(event.target.value)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>格式</span>
          <select value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)}>
            <option value="json">JSON</option>
            <option value="ndjson">NDJSON</option>
            <option value="csv">CSV</option>
          </select>
        </label>
        <button type="button" onClick={() => void copyOutput()}>
          复制数据
        </button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>字段 Schema</span>
          <textarea value={schema} onChange={(event) => setSchema(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>输出</span>
          <textarea value={output} readOnly spellCheck={false} />
        </label>
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>字段数</h3>
          <p>{parseSchema(schema).length}</p>
        </article>
        <article className="detail-card">
          <h3>记录数</h3>
          <p>{rows.length}</p>
        </article>
        <article className="detail-card">
          <h3>输出格式</h3>
          <p>{format.toUpperCase()}</p>
        </article>
      </div>
    </section>
  );
}
