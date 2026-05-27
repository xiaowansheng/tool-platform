"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

const mimeTypes = [
  { ext: "html", type: "text/html", note: "HTML document" },
  { ext: "css", type: "text/css", note: "Stylesheet" },
  { ext: "js", type: "text/javascript", note: "JavaScript module/script" },
  { ext: "json", type: "application/json", note: "JSON payload" },
  { ext: "xml", type: "application/xml", note: "XML document" },
  { ext: "txt", type: "text/plain", note: "Plain text" },
  { ext: "csv", type: "text/csv", note: "Comma-separated values" },
  { ext: "svg", type: "image/svg+xml", note: "SVG vector image" },
  { ext: "png", type: "image/png", note: "PNG image" },
  { ext: "jpg", type: "image/jpeg", note: "JPEG image" },
  { ext: "webp", type: "image/webp", note: "WebP image" },
  { ext: "pdf", type: "application/pdf", note: "PDF document" },
  { ext: "zip", type: "application/zip", note: "Zip archive" },
  { ext: "wasm", type: "application/wasm", note: "WebAssembly binary" },
  { ext: "mp4", type: "video/mp4", note: "MP4 video" },
  { ext: "mp3", type: "audio/mpeg", note: "MP3 audio" }
];

export default function MimeTypeLookupTool({ manifest }: ToolClientProps) {
  const [query, setQuery] = useState("json");
  const normalized = query.trim().replace(/^\./, "").toLowerCase();
  const results = mimeTypes.filter((item) =>
    item.ext.includes(normalized) || item.type.toLowerCase().includes(normalized) || item.note.toLowerCase().includes(normalized)
  );

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Developer Reference</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>扩展名或 MIME</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="case-grid">
        {results.map((item) => (
          <article key={item.ext} className="detail-card">
            <p className="eyebrow">.{item.ext}</p>
            <h3>{item.type}</h3>
            <p>{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
