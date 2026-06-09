"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8g demo@example";

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function readString(bytes: Uint8Array, offset: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint32(offset);
  const start = offset + 4;
  return { value: new TextDecoder().decode(bytes.slice(start, start + length)), next: start + length };
}

function estimateBits(type: string, bytes: Uint8Array) {
  try {
    let offset = readString(bytes, 0).next;
    if (type === "ssh-rsa") offset = readString(bytes, offset).next;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const length = view.getUint32(offset);
    const keyBytes = bytes.slice(offset + 4, offset + 4 + length);
    if (type === "ssh-ed25519") return keyBytes.length * 8;
    const leading = keyBytes[0] === 0 ? 1 : 0;
    return Math.max(0, (keyBytes.length - leading) * 8);
  } catch {
    return 0;
  }
}

async function sha256Fingerprint(base64: string) {
  const bytes = base64ToBytes(base64);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const binary = Array.from(new Uint8Array(digest)).map((byte) => String.fromCharCode(byte)).join("");
  return "SHA256:" + btoa(binary).replace(/=+$/, "");
}

function parseKey(input: string) {
  const parts = input.trim().split(/\s+/);
  if (parts.length < 2) throw new Error("Expected OpenSSH public key: <type> <base64> [comment]");
  const [type, base64, ...comment] = parts;
  const bytes = base64ToBytes(base64!);
  const embeddedType = readString(bytes, 0).value;
  return { type: type!, embeddedType, base64: base64!, comment: comment.join(" "), bits: estimateBits(type!, bytes), bytes: bytes.length };
}

export default function SshKeyInspectorTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState(sampleKey);
  const [fingerprint, setFingerprint] = useState("");
  const parsedResult = useMemo(() => {
    try {
      return { key: parseKey(input), error: "" };
    } catch (parseError) {
      return { key: null, error: parseError instanceof Error ? parseError.message : "Unable to parse key" };
    }
  }, [input]);
  const parsed = parsedResult.key;
  const error = parsedResult.error;

  async function computeFingerprint() {
    if (!parsed) return;
    setFingerprint(await sha256Fingerprint(parsed.base64));
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Public key audit</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar"><button type="button" onClick={() => void computeFingerprint()} disabled={!parsed}>Compute fingerprint</button><button type="button" onClick={() => setInput(sampleKey)}>Load sample</button></div>
      <label className="tool-field"><span>OpenSSH public key</span><textarea value={input} onChange={(event) => { setInput(event.target.value); setFingerprint(""); }} spellCheck={false} /></label>
      {parsed ? <div className="detail-grid"><article className="detail-card"><h3>Algorithm</h3><p>{parsed.type}</p></article><article className="detail-card"><h3>Embedded type</h3><p>{parsed.embeddedType}</p></article><article className="detail-card"><h3>Bits</h3><p>{parsed.bits || "unknown"}</p></article><article className="detail-card"><h3>Bytes</h3><p>{parsed.bytes}</p></article><article className="detail-card"><h3>Comment</h3><p>{parsed.comment || "none"}</p></article><article className="detail-card"><h3>Fingerprint</h3><p>{fingerprint || "not computed"}</p></article></div> : null}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
