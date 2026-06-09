"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleSaml = "PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2wiIElEPSJyZXNwMTIzIj48c2FtbDpJc3N1ZXIgeG1sbnM6c2FtbD0idXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmFzc2VydGlvbiI+aHR0cHM6Ly9pZHAuZXhhbXBsZS5jb208L3NhbWw6SXNzdWVyPjxzYW1sOkFzc2VydGlvbiB4bWxuczpzYW1sPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uIj48c2FtbDpTdWJqZWN0PjxzYW1sOk5hbWVJRD5hZGFAZXhhbXBsZS5jb208L3NhbWw6TmFtZUlEPjwvc2FtbDpTdWJqZWN0PjxzYW1sOkF0dHJpYnV0ZVN0YXRlbWVudD48c2FtbDpBdHRyaWJ1dGUgTmFtZT0iZW1haWwiPjxzYW1sOkF0dHJpYnV0ZVZhbHVlPmFkYUBleGFtcGxlLmNvbTwvc2FtbDpBdHRyaWJ1dGVWYWx1ZT48L3NhbWw6QXR0cmlidXRlPjwvc2FtbDpBdHRyaWJ1dGVTdGF0ZW1lbnQ+PC9zYW1sOkFzc2VydGlvbj48L3NhbWxwOlJlc3BvbnNlPg==";

function decodeBase64(input: string) {
  const cleaned = decodeURIComponent(input.trim()).replace(/^SAML(Request|Response)=/, "").replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = cleaned + "=".repeat((4 - cleaned.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function formatXml(xml: string) {
  return xml.replace(/></g, ">\n<").split("\n").map((line) => line.trim()).filter(Boolean).map((line, index, all) => {
    const closes = line.startsWith("</") ? 1 : 0;
    const previous = all.slice(0, index).reduce((depth, item) => depth + (item.startsWith("</") ? -1 : item.includes("</") || item.endsWith("/>") ? 0 : 1), 0);
    return "  ".repeat(Math.max(0, previous - closes)) + line;
  }).join("\n");
}

function textByTag(xml: string, tag: string) {
  const match = xml.match(new RegExp("<[^:>]*:?" + tag + "[^>]*>([\\s\\S]*?)</[^:>]*:?" + tag + ">", "i"));
  return match ? match[1]!.replace(/<[^>]+>/g, "").trim() : "";
}

export default function SamlDecoderTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(sampleSaml);
  const decodedResult = useMemo(() => {
    try {
      const xml = decodeBase64(input);
      if (!xml.trim().startsWith("<")) throw new Error("Decoded payload is not plain XML. HTTP-Redirect deflate payloads are not expanded by this lightweight decoder.");
      return { xml: formatXml(xml), error: "" };
    } catch (decodeError) {
      return { xml: "", error: decodeError instanceof Error ? decodeError.message : "Decode failed" };
    }
  }, [input]);
  const decoded = decodedResult.xml;
  const error = decodedResult.error;
  const issuer = decoded ? textByTag(decoded, "Issuer") : "";
  const nameId = decoded ? textByTag(decoded, "NameID") : "";
  const hasSignature = /<[^>]*Signature\b/i.test(decoded);
  const attributeCount = (decoded.match(/<[^>]*Attribute\b/gi) || []).length;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">SSO debugging</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar"><button type="button" onClick={() => setInput(sampleSaml)}>Load sample</button><button type="button" onClick={() => void navigator.clipboard.writeText(decoded)} disabled={!decoded}>Copy XML</button></div>
      <div className="workspace workspace--two-column"><label className="tool-field"><span>SAML Request / Response</span><textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} /></label><label className="tool-field"><span>Decoded XML</span><textarea value={decoded} readOnly spellCheck={false} /></label></div>
      <div className="detail-grid"><article className="detail-card"><h3>Issuer</h3><p>{issuer || "Not found"}</p></article><article className="detail-card"><h3>NameID</h3><p>{nameId || "Not found"}</p></article><article className="detail-card"><h3>Attributes</h3><p>{attributeCount}</p></article><article className="detail-card"><h3>Signature</h3><p>{hasSignature ? "present" : "not present"}</p></article></div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
