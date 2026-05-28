"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type Mode = "jwkToPem" | "pemToJwk" | "inspectCsr";

function pemToBytes(pem: string) {
  const base64 = pem.replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/g, "");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function bytesToPem(label: string, bytes: ArrayBuffer) {
  const binary = Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join("");
  const base64 = btoa(binary).replace(/(.{64})/g, "$1\n").trim();
  return `-----BEGIN ${label}-----\n${base64}\n-----END ${label}-----`;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function jwkToPem(input: string) {
  const jwk = JSON.parse(input) as JsonWebKey;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, true, ["verify"]);
  return bytesToPem("PUBLIC KEY", await crypto.subtle.exportKey("spki", key));
}

async function pemToJwk(input: string) {
  const key = await crypto.subtle.importKey("spki", pemToBytes(input), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, true, ["verify"]);
  return JSON.stringify(await crypto.subtle.exportKey("jwk", key), null, 2);
}

async function inspectCsr(input: string) {
  const bytes = pemToBytes(input);
  return JSON.stringify({
    type: input.includes("CERTIFICATE REQUEST") ? "CSR" : "PEM",
    bytes: bytes.byteLength,
    sha256: toHex(await crypto.subtle.digest("SHA-256", bytes))
  }, null, 2);
}

export default function PemJwkToolkitTool({ manifest }: ToolClientProps) {
  const [mode, setMode] = useState<Mode>("inspectCsr");
  const [input, setInput] = useState("-----BEGIN CERTIFICATE REQUEST-----\nMIIB...replace-with-csr...\n-----END CERTIFICATE REQUEST-----");
  const [output, setOutput] = useState("");

  async function run() {
    try {
      if (mode === "jwkToPem") setOutput(await jwkToPem(input));
      if (mode === "pemToJwk") setOutput(await pemToJwk(input));
      if (mode === "inspectCsr") setOutput(await inspectCsr(input));
    } catch (error) {
      setOutput(error instanceof Error ? error.message : "转换失败");
    }
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">Key Utility</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>Mode</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
            <option value="inspectCsr">Inspect CSR / PEM</option>
            <option value="jwkToPem">RSA JWK → PEM public key</option>
            <option value="pemToJwk">RSA PEM public key → JWK</option>
          </select>
        </label>
        <button type="button" onClick={() => void run()}>运行</button>
        <button type="button" onClick={() => void copyOutput()}>复制输出</button>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field"><span>输入</span><textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} /></label>
        <label className="tool-field"><span>输出</span><textarea value={output} readOnly spellCheck={false} /></label>
      </div>
    </section>
  );
}
