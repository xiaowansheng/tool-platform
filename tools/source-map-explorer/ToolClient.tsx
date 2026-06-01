"use client";

import { useMemo, useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

interface RawSourceMap {
  version?: number;
  file?: string;
  sources?: string[];
  sourcesContent?: Array<string | null>;
  names?: string[];
  mappings?: string;
}

interface MappingSegment {
  generatedLine: number;
  generatedColumn: number;
  sourceIndex?: number;
  originalLine?: number;
  originalColumn?: number;
  nameIndex?: number;
}

interface SourceStat {
  source: string;
  contentBytes: number;
  mappedBytes: number;
  segments: number;
  percent: number;
}

const sampleMap = JSON.stringify({
  version: 3,
  file: "bundle.js",
  sources: ["src/math.ts", "src/index.ts"],
  sourcesContent: [
    "export function add(a: number, b: number) {\n  return a + b;\n}\n",
    "import { add } from './math';\nconsole.log(add(1, 2));\n"
  ],
  names: ["add", "console", "log"],
  mappings: "AAAA,SAASA,IAAI,CAAC,CAAC,EAAG,CAAC;AACpB,SAAO,CAAC,GAAG,CAAC;ACDZC,OAAO,CAACC,GAAG,CAACF,IAAI,CAAC,CAAC,EAAG,CAAC,CAAC,CAAC"
}, null, 2);
const sampleBundle = "function add(a,b){\nreturn a+b;\n}\nconsole.log(add(1,2));\n";
const base64Values = new Map("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("").map((char, index) => [char, index]));
const textEncoder = new TextEncoder();

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function byteLength(value: string) {
  return textEncoder.encode(value).length;
}

function decodeVlq(input: string, index: number) {
  let result = 0;
  let shift = 0;
  let nextIndex = index;
  let continuation = true;

  while (continuation && nextIndex < input.length) {
    const digit = base64Values.get(input[nextIndex]);

    if (digit === undefined) {
      throw new Error(`Invalid VLQ character: ${input[nextIndex]}`);
    }

    nextIndex += 1;
    continuation = Boolean(digit & 32);
    result += (digit & 31) << shift;
    shift += 5;
  }

  const negative = Boolean(result & 1);
  const value = result >> 1;

  return {
    value: negative ? -value : value,
    nextIndex
  };
}

function parseMappings(mappings: string) {
  const segments: MappingSegment[] = [];
  let generatedLine = 0;
  let previousSource = 0;
  let previousOriginalLine = 0;
  let previousOriginalColumn = 0;
  let previousName = 0;

  for (const line of mappings.split(";")) {
    let previousGeneratedColumn = 0;

    for (const rawSegment of line.split(",")) {
      if (!rawSegment) continue;

      let index = 0;
      const generatedColumnPart = decodeVlq(rawSegment, index);
      const segment: MappingSegment = {
        generatedLine,
        generatedColumn: previousGeneratedColumn + generatedColumnPart.value
      };

      previousGeneratedColumn = segment.generatedColumn;
      index = generatedColumnPart.nextIndex;

      if (index < rawSegment.length) {
        const sourcePart = decodeVlq(rawSegment, index);
        previousSource += sourcePart.value;
        index = sourcePart.nextIndex;

        const originalLinePart = decodeVlq(rawSegment, index);
        previousOriginalLine += originalLinePart.value;
        index = originalLinePart.nextIndex;

        const originalColumnPart = decodeVlq(rawSegment, index);
        previousOriginalColumn += originalColumnPart.value;
        index = originalColumnPart.nextIndex;

        segment.sourceIndex = previousSource;
        segment.originalLine = previousOriginalLine;
        segment.originalColumn = previousOriginalColumn;

        if (index < rawSegment.length) {
          const namePart = decodeVlq(rawSegment, index);
          previousName += namePart.value;
          segment.nameIndex = previousName;
        }
      }

      segments.push(segment);
    }

    generatedLine += 1;
  }

  return segments;
}

function lineLength(lines: string[], lineIndex: number) {
  return lines[lineIndex]?.length ?? 0;
}

function analyzeSourceMap(raw: RawSourceMap, bundle: string) {
  const sources = raw.sources ?? [];
  const sourceContent = raw.sourcesContent ?? [];
  const segments = parseMappings(raw.mappings ?? "");
  const stats = new Map<number, { mappedBytes: number; segments: number }>();
  const bundleLines = bundle ? bundle.split(/\r?\n/) : [];
  const sortedByLine = new Map<number, MappingSegment[]>();

  for (const segment of segments) {
    if (segment.sourceIndex === undefined) continue;

    const list = sortedByLine.get(segment.generatedLine) ?? [];
    list.push(segment);
    sortedByLine.set(segment.generatedLine, list);
  }

  for (const list of sortedByLine.values()) {
    list.sort((left, right) => left.generatedColumn - right.generatedColumn);

    for (let index = 0; index < list.length; index += 1) {
      const segment = list[index];
      const sourceIndex = segment.sourceIndex;

      if (sourceIndex === undefined) continue;

      const nextColumn = list[index + 1]?.generatedColumn ?? (bundleLines.length > 0 ? lineLength(bundleLines, segment.generatedLine) : segment.generatedColumn + 1);
      const width = Math.max(0, nextColumn - segment.generatedColumn);
      const stat = stats.get(sourceIndex) ?? { mappedBytes: 0, segments: 0 };

      stat.mappedBytes += Math.max(1, width);
      stat.segments += 1;
      stats.set(sourceIndex, stat);
    }
  }

  const rows: SourceStat[] = sources.map((source, index) => {
    const content = sourceContent[index] ?? "";
    const stat = stats.get(index) ?? { mappedBytes: 0, segments: 0 };

    return {
      source,
      contentBytes: byteLength(content ?? ""),
      mappedBytes: stat.mappedBytes,
      segments: stat.segments,
      percent: 0
    };
  });
  const totalMapped = rows.reduce((sum, row) => sum + row.mappedBytes, 0);
  const withPercent = rows.map((row) => ({
    ...row,
    percent: totalMapped > 0 ? row.mappedBytes / totalMapped * 100 : 0
  })).sort((left, right) => right.mappedBytes - left.mappedBytes || right.contentBytes - left.contentBytes);

  return {
    rows: withPercent,
    segments,
    totalMapped,
    mappedSources: rows.filter((row) => row.segments > 0).length
  };
}

function lookupSegment(segments: MappingSegment[], generatedLine: number, generatedColumn: number) {
  return segments
    .filter((segment) => segment.generatedLine === generatedLine && segment.generatedColumn <= generatedColumn && segment.sourceIndex !== undefined)
    .sort((left, right) => right.generatedColumn - left.generatedColumn)[0] ?? null;
}

function sourceSnippet(raw: RawSourceMap, segment: MappingSegment | null) {
  if (!segment || segment.sourceIndex === undefined || segment.originalLine === undefined) return "";

  const content = raw.sourcesContent?.[segment.sourceIndex];

  if (!content) return "";

  return content.split(/\r?\n/)[segment.originalLine]?.trim() ?? "";
}

export default function SourceMapExplorerTool({ manifest }: ToolClientProps) {
  const [mapInput, setMapInput] = useState(sampleMap);
  const [bundleInput, setBundleInput] = useState(sampleBundle);
  const [lookupLine, setLookupLine] = useState(1);
  const [lookupColumn, setLookupColumn] = useState(0);
  const report = useMemo(() => {
    try {
      const raw = JSON.parse(mapInput) as RawSourceMap;

      if (raw.version !== 3 || !Array.isArray(raw.sources) || typeof raw.mappings !== "string") {
        throw new Error("需要 version=3 且包含 sources 与 mappings 的 Source Map");
      }

      const analysis = analyzeSourceMap(raw, bundleInput);
      const segment = lookupSegment(analysis.segments, Math.max(0, lookupLine - 1), Math.max(0, lookupColumn));

      return {
        raw,
        analysis,
        segment,
        snippet: sourceSnippet(raw, segment),
        error: ""
      };
    } catch (parseError) {
      const raw = JSON.parse(sampleMap) as RawSourceMap;
      const analysis = analyzeSourceMap(raw, sampleBundle);

      return {
        raw,
        analysis,
        segment: null,
        snippet: "",
        error: parseError instanceof Error ? parseError.message : "Source Map 解析失败"
      };
    }
  }, [bundleInput, lookupColumn, lookupLine, mapInput]);

  async function loadMap(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (file) {
      setMapInput(await file.text());
    }
  }

  async function loadBundle(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (file) {
      setBundleInput(await file.text());
    }
  }

  const sourceName = report.segment?.sourceIndex !== undefined ? report.raw.sources?.[report.segment.sourceIndex] ?? "未知" : "无";
  const originalLine = report.segment?.originalLine !== undefined ? report.segment.originalLine + 1 : "无";
  const originalColumn = report.segment?.originalColumn ?? "无";
  const originalName = report.segment?.nameIndex !== undefined ? report.raw.names?.[report.segment.nameIndex] ?? "无" : "无";

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">包分析</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>Source Map 文件</span>
          <input type="file" accept=".map,application/json" onChange={(event) => void loadMap(event)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>可选 Bundle JS</span>
          <input type="file" accept=".js,.mjs,text/javascript" onChange={(event) => void loadBundle(event)} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>生成行</span>
          <input type="number" min="1" value={lookupLine} onChange={(event) => setLookupLine(Number(event.target.value))} />
        </label>
        <label className="tool-field tool-field--compact">
          <span>生成列</span>
          <input type="number" min="0" value={lookupColumn} onChange={(event) => setLookupColumn(Number(event.target.value))} />
        </label>
      </div>

      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>Source Map JSON</span>
          <textarea value={mapInput} onChange={(event) => setMapInput(event.target.value)} spellCheck={false} />
        </label>
        <label className="tool-field">
          <span>Bundle JS（用于估算生成体积）</span>
          <textarea value={bundleInput} onChange={(event) => setBundleInput(event.target.value)} spellCheck={false} />
        </label>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>源文件</h3>
          <p>{report.raw.sources?.length ?? 0}</p>
        </article>
        <article className="detail-card">
          <h3>已映射</h3>
          <p>{report.analysis.mappedSources}</p>
        </article>
        <article className="detail-card">
          <h3>分段</h3>
          <p>{report.analysis.segments.length}</p>
        </article>
        <article className="detail-card">
          <h3>已映射字节</h3>
          <p>{formatBytes(report.analysis.totalMapped)}</p>
        </article>
      </div>

      <div className="detail-card">
        <p className="eyebrow">位置查询</p>
        <p className="mono-output">{sourceName}:{originalLine}:{originalColumn} {originalName !== "n/a" ? `(${originalName})` : ""}</p>
        {report.snippet ? <p className="mono-output">{report.snippet}</p> : <p>未找到该生成位置之前的映射片段。</p>}
      </div>

      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "minmax(14rem, 1fr) 7rem 7rem 7rem 6rem" }}>
          <span>源</span>
          <span>已映射</span>
          <span>内容</span>
          <span>分段</span>
          <span>%</span>
        </div>
        {report.analysis.rows.slice(0, 120).map((row) => (
          <div key={row.source} className="tool-table__row" style={{ gridTemplateColumns: "minmax(14rem, 1fr) 7rem 7rem 7rem 6rem" }}>
            <span className="mono-output">{row.source}</span>
            <span>{formatBytes(row.mappedBytes)}</span>
            <span>{formatBytes(row.contentBytes)}</span>
            <span>{row.segments}</span>
            <span>{row.percent.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      <p className="tool-note">体积分布按 mappings 在生成文件中的列宽估算；若不提供 Bundle JS，则按映射段宽度退化估算。</p>
      {report.error ? <p className="tool-error">{report.error}</p> : null}
    </section>
  );
}
