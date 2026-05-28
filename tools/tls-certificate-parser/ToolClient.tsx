"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

function pemToBytes(pem: string) {
  const base64 = pem.replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/g, "");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function readDerLength(bytes: Uint8Array, offset: number) {
  const first = bytes[offset];
  if (first === undefined) return { length: 0, next: offset + 1 };
  if (first < 0x80) return { length: first, next: offset + 1 };
  const count = first & 0x7f;
  let length = 0;
  for (let index = 0; index < count; index += 1) {
    length = (length << 8) + (bytes[offset + 1 + index] ?? 0);
  }
  return { length, next: offset + 1 + count };
}

function extractReadableValues(bytes: Uint8Array) {
  const values: string[] = [];
  const decoder = new TextDecoder();

  for (let offset = 0; offset < bytes.length - 2; offset += 1) {
    const tag = bytes[offset];
    if (![0x0c, 0x13, 0x16, 0x17, 0x18].includes(tag ?? 0)) continue;
    const { length, next } = readDerLength(bytes, offset + 1);
    if (length <= 0 || length > 160 || next + length > bytes.length) continue;
    const text = decoder.decode(bytes.slice(next, next + length));
    if (/^[\x20-\x7e]+$/.test(text)) values.push(text);
  }

  return Array.from(new Set(values)).slice(0, 32);
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join(":");
}

const sampleCert = `-----BEGIN CERTIFICATE-----
MIIBszCCAVmgAwIBAgIUT29sUGxhdGZvcm1EZW1vQ2VydDAKBggqhkjOPQQDAjAa
MRgwFgYDVQQDDA90b29sLXBsYXRmb3JtMB4XDTI2MDEwMTAwMDAwMFoXDTI3MDEw
MTAwMDAwMFowGjEYMBYGA1UEAwwPdG9vbC1wbGF0Zm9ybTBZMBMGByqGSM49AgEG
CCqGSM49AwEHA0IABN8yDemoOnlyCertificateBodyForLocalParsingExample
-----END CERTIFICATE-----`;

export default function TlsCertificateParserTool({ manifest }: ToolClientProps) {
  const [pem, setPem] = useState(sampleCert);
  const [report, setReport] = useState("点击解析证书。");

  async function parseCertificate() {
    try {
      const bytes = pemToBytes(pem);
      const fingerprint = toHex(await crypto.subtle.digest("SHA-256", bytes));
      setReport(JSON.stringify({
        bytes: bytes.byteLength,
        sha256Fingerprint: fingerprint,
        readableValues: extractReadableValues(bytes)
      }, null, 2));
    } catch (error) {
      setReport(error instanceof Error ? error.message : "证书解析失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">TLS Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar"><button type="button" onClick={() => void parseCertificate()}>解析证书</button></div>
      <div className="workspace workspace--two-column">
        <label className="tool-field"><span>Certificate PEM</span><textarea value={pem} onChange={(event) => setPem(event.target.value)} spellCheck={false} /></label>
        <label className="tool-field"><span>Report</span><textarea value={report} readOnly spellCheck={false} /></label>
      </div>
      <p className="tool-note">轻量 ASN.1 扫描用于本地检查摘要和可读字段；完整 X.509 语义解析后续可接入专用解析器。</p>
    </section>
  );
}
