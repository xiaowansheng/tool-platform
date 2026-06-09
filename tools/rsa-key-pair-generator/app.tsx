"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function toPem(label: string, buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary).replace(/(.{64})/g, "$1\n").trim();
  return "-----BEGIN " + label + "-----\n" + base64 + "\n-----END " + label + "-----";
}

async function exportKeys(modulusLength: number) {
  const keyPair = await crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
  const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  return { publicPem: toPem("PUBLIC KEY", publicKey), privatePem: toPem("PRIVATE KEY", privateKey) };
}

export default function RsaKeyPairGeneratorTool({ manifest }: ToolAppProps) {
  const [size, setSize] = useState(2048);
  const [publicPem, setPublicPem] = useState("");
  const [privatePem, setPrivatePem] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState("");

  async function generate() {
    setStatus("Generating key pair in this browser...");
    setCopied("");
    try {
      const keys = await exportKeys(size);
      setPublicPem(keys.publicPem);
      setPrivatePem(keys.privatePem);
      setStatus("Generated RSA-OAEP / SHA-256 key pair.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Key generation failed");
    }
  }

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Browser crypto</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar"><label className="tool-field tool-field--compact"><span>Key size</span><select value={size} onChange={(event) => setSize(Number(event.target.value))}><option value={2048}>2048 bit</option><option value={3072}>3072 bit</option><option value={4096}>4096 bit</option></select></label><button type="button" onClick={() => void generate()}>Generate keys</button><button type="button" onClick={() => void copy("public", publicPem)} disabled={!publicPem}>{copied === "public" ? "Copied public" : "Copy public"}</button><button type="button" onClick={() => void copy("private", privatePem)} disabled={!privatePem}>{copied === "private" ? "Copied private" : "Copy private"}</button></div>
      {status ? <p className="tool-note">{status}</p> : null}
      <div className="workspace workspace--two-column"><label className="tool-field"><span>Public key PEM</span><textarea value={publicPem} readOnly spellCheck={false} /></label><label className="tool-field"><span>Private key PEM</span><textarea value={privatePem} readOnly spellCheck={false} /></label></div>
      <div className="detail-grid"><article className="detail-card"><h3>Algorithm</h3><p>RSA-OAEP</p></article><article className="detail-card"><h3>Hash</h3><p>SHA-256</p></article><article className="detail-card"><h3>Extractable</h3><p>PEM export enabled</p></article></div>
    </section>
  );
}
