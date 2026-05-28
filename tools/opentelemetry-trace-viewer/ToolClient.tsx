"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId: string;
  name: string;
  serviceName: string;
  startMs: number;
  endMs: number;
}

interface TimelineRow extends Span {
  depth: number;
}

const sampleTrace = JSON.stringify([
  {
    traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    spanId: "00f067aa0ba902b7",
    name: "GET /checkout",
    serviceName: "gateway",
    startTimeUnixNano: "1717000000000000000",
    endTimeUnixNano: "1717000001200000000"
  },
  {
    traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    spanId: "b7ad6b7169203331",
    parentSpanId: "00f067aa0ba902b7",
    name: "POST /payments",
    serviceName: "payments",
    startTimeUnixNano: "1717000000250000000",
    endTimeUnixNano: "1717000000950000000"
  },
  {
    traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    spanId: "cc9d7ab1f3f82d11",
    parentSpanId: "00f067aa0ba902b7",
    name: "SELECT inventory",
    serviceName: "inventory",
    startTimeUnixNano: "1717000000400000000",
    endTimeUnixNano: "1717000000850000000"
  }
], null, 2);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function attributeValue(value: unknown) {
  const record = asRecord(value);
  const raw = record.stringValue ?? record.intValue ?? record.doubleValue ?? record.boolValue;

  return raw === undefined ? "" : String(raw);
}

function readAttributes(attributes: unknown) {
  const result = new Map<string, string>();

  asArray(attributes).forEach((item) => {
    const attribute = asRecord(item);
    const key = String(attribute.key ?? "");
    if (key) result.set(key, attributeValue(attribute.value));
  });

  return result;
}

function toMs(value: unknown) {
  const numeric = Number(value ?? 0);

  return Number.isFinite(numeric) ? numeric / 1_000_000 : 0;
}

function normalizeFlatSpan(value: unknown, inheritedService = "unknown"): Span {
  const record = asRecord(value);
  const attributes = readAttributes(record.attributes);

  return {
    traceId: String(record.traceId ?? ""),
    spanId: String(record.spanId ?? ""),
    parentSpanId: String(record.parentSpanId ?? ""),
    name: String(record.name ?? "unnamed span"),
    serviceName: String(record.serviceName ?? attributes.get("service.name") ?? inheritedService),
    startMs: toMs(record.startTimeUnixNano),
    endMs: toMs(record.endTimeUnixNano)
  };
}

function normalizeTrace(source: string): Span[] {
  const parsed = JSON.parse(source) as unknown;

  if (Array.isArray(parsed)) {
    return parsed.map((item) => normalizeFlatSpan(item));
  }

  const root = asRecord(parsed);
  const spans: Span[] = [];

  asArray(root.resourceSpans).forEach((resourceSpan) => {
    const resource = asRecord(resourceSpan);
    const serviceName = readAttributes(asRecord(resource.resource).attributes).get("service.name") ?? "unknown";

    asArray(resource.scopeSpans).forEach((scopeSpan) => {
      asArray(asRecord(scopeSpan).spans).forEach((span) => {
        spans.push(normalizeFlatSpan(span, serviceName));
      });
    });
  });

  return spans;
}

function duration(span: Span) {
  return Math.max(0, span.endMs - span.startMs);
}

function buildTimeline(spans: Span[]) {
  const byParent = new Map<string, Span[]>();
  const byId = new Map(spans.map((span) => [span.spanId, span]));

  spans.forEach((span) => {
    const parent = span.parentSpanId && byId.has(span.parentSpanId) ? span.parentSpanId : "root";
    byParent.set(parent, [...(byParent.get(parent) ?? []), span]);
  });

  const rows: TimelineRow[] = [];
  const visit = (span: Span, depth: number) => {
    rows.push({ ...span, depth });
    (byParent.get(span.spanId) ?? []).sort((left, right) => left.startMs - right.startMs).forEach((child) => visit(child, depth + 1));
  };

  (byParent.get("root") ?? []).sort((left, right) => left.startMs - right.startMs).forEach((span) => visit(span, 0));

  return rows;
}

function serviceStats(spans: Span[]) {
  const stats = new Map<string, { count: number; totalMs: number }>();

  spans.forEach((span) => {
    const current = stats.get(span.serviceName) ?? { count: 0, totalMs: 0 };
    stats.set(span.serviceName, { count: current.count + 1, totalMs: current.totalMs + duration(span) });
  });

  return Array.from(stats.entries()).sort((left, right) => right[1].totalMs - left[1].totalMs);
}

function formatMs(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ms`;
}

export default function OpenTelemetryTraceViewerTool({ manifest }: ToolClientProps) {
  const [source, setSource] = useState(sampleTrace);
  const [error, setError] = useState("");
  const spans = useMemo(() => {
    try {
      setError("");
      return normalizeTrace(source);
    } catch (traceError) {
      setError(traceError instanceof Error ? traceError.message : "Trace JSON 解析失败");
      return [];
    }
  }, [source]);
  const rows = buildTimeline(spans);
  const totalDuration = spans.length > 0 ? Math.max(...spans.map((span) => span.endMs)) - Math.min(...spans.map((span) => span.startMs)) : 0;
  const slowest = [...spans].sort((left, right) => duration(right) - duration(left))[0];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Tracing Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>OTLP / Span JSON</span>
        <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} />
      </label>
      <div className="detail-grid">
        <article className="detail-card">
          <h3>Spans</h3>
          <p>{spans.length}</p>
        </article>
        <article className="detail-card">
          <h3>Services</h3>
          <p>{new Set(spans.map((span) => span.serviceName)).size}</p>
        </article>
        <article className="detail-card">
          <h3>Trace Duration</h3>
          <p>{formatMs(totalDuration)}</p>
        </article>
        <article className="detail-card">
          <h3>Slowest Span</h3>
          <p>{slowest ? `${slowest.name} ${formatMs(duration(slowest))}` : "none"}</p>
        </article>
      </div>
      <article className="diff-view" aria-label="Trace timeline">
        {rows.map((row) => (
          <div key={row.spanId} className="diff-line diff-line--equal">
            <span>{row.depth}</span>
            <code>{"  ".repeat(row.depth)}{row.serviceName} / {row.name} / {formatMs(duration(row))}</code>
          </div>
        ))}
      </article>
      <article className="detail-card">
        <h3>服务耗时</h3>
        <ul className="compact-list">
          {serviceStats(spans).map(([service, stat]) => (
            <li key={service}>{service}: {stat.count} spans, {formatMs(stat.totalMs)}</li>
          ))}
        </ul>
      </article>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
