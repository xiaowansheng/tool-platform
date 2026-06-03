"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type KeyAlgo = "RSA" | "ECDSA";
type HashAlgo = "SHA-256" | "SHA-384" | "SHA-512";

interface FormState {
  commonName: string;
  organization: string;
  orgUnit: string;
  locality: string;
  state: string;
  country: string;
  email: string;
  keyAlgo: KeyAlgo;
  hashAlgo: HashAlgo;
  keySize: number;
}

const defaultForm: FormState = {
  commonName: "",
  organization: "",
  orgUnit: "",
  locality: "",
  state: "",
  country: "",
  email: "",
  keyAlgo: "ECDSA",
  hashAlgo: "SHA-256",
  keySize: 2048
};

function bufToPem(buf: ArrayBuffer, label: string): string {
  const b64 = btoa(Array.from(new Uint8Array(buf), (b) => String.fromCharCode(b)).join(""));
  const lines = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

// Simple ASN.1 DER encoder for CSR
function derLen(len: number): Uint8Array {
  if (len < 0x80) return new Uint8Array([len]);
  const bytes: number[] = [];
  let tmp = len;
  while (tmp > 0) { bytes.unshift(tmp & 0xff); tmp >>= 8; }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

function derTag(tag: number, content: Uint8Array): Uint8Array {
  const lenBytes = derLen(content.length);
  const result = new Uint8Array(1 + lenBytes.length + content.length);
  result[0] = tag;
  result.set(lenBytes, 1);
  result.set(content, 1 + lenBytes.length);
  return result;
}

function derSequence(...items: Uint8Array[]): Uint8Array {
  const total = items.reduce((s, i) => s + i.length, 0);
  const content = new Uint8Array(total);
  let offset = 0;
  for (const item of items) { content.set(item, offset); offset += item.length; }
  return derTag(0x30, content);
}

function derSet(item: Uint8Array): Uint8Array {
  return derTag(0x31, item);
}

function derOid(oid: string): Uint8Array {
  const parts = oid.split(".").map(Number);
  const bytes: number[] = [parts[0]! * 40 + parts[1]!];
  for (let i = 2; i < parts.length; i++) {
    let val = parts[i]!;
    if (val < 128) { bytes.push(val); continue; }
    const stack: number[] = [];
    while (val > 0) { stack.unshift(val & 0x7f); val >>= 7; }
    for (let j = 0; j < stack.length; j++) {
      bytes.push(j < stack.length - 1 ? stack[j]! | 0x80 : stack[j]!);
    }
  }
  return derTag(0x06, new Uint8Array(bytes));
}

function derUtf8(str: string): Uint8Array {
  return derTag(0x0c, new TextEncoder().encode(str));
}

function derPrintable(str: string): Uint8Array {
  return derTag(0x13, new TextEncoder().encode(str));
}

function derInteger(n: number): Uint8Array {
  if (n === 0) return derTag(0x02, new Uint8Array([0]));
  const bytes: number[] = [];
  let tmp = n;
  while (tmp > 0) { bytes.unshift(tmp & 0xff); tmp >>= 8; }
  if (bytes[0]! & 0x80) bytes.unshift(0);
  return derTag(0x02, new Uint8Array(bytes));
}

function derBitString(content: Uint8Array): Uint8Array {
  const padded = new Uint8Array(content.length + 1);
  padded[0] = 0; // no unused bits
  padded.set(content, 1);
  return derTag(0x03, padded);
}

// OIDs for CSR attributes
const OID = {
  cn: "2.5.4.3",
  ou: "2.5.4.11",
  o: "2.5.4.10",
  l: "2.5.4.7",
  st: "2.5.4.8",
  c: "2.5.4.6",
  email: "1.2.840.113549.1.9.1"
};

function buildRdn(oid: string, value: string): Uint8Array | null {
  if (!value) return null;
  const isEmail = oid === OID.email;
  return derSet(derSequence(derOid(oid), isEmail ? derUtf8(value) : derPrintable(value)));
}

export default function CsrGeneratorTool({ manifest }: ToolAppProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [csrPem, setCsrPem] = useState("");
  const [privKeyPem, setPrivKeyPem] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function update(field: keyof FormState, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setCsrPem("");
    setPrivKeyPem("");
    setCopied(null);

    try {
      if (!form.commonName) throw new Error("Common Name (CN) 不能为空");

      // Generate key pair
      let keyPair: CryptoKeyPair;
      if (form.keyAlgo === "RSA") {
        keyPair = await crypto.subtle.generateKey(
          { name: "RSASSA-PKCS1-v1_5", modulusLength: form.keySize, publicExponent: new Uint8Array([1, 0, 1]), hash: form.hashAlgo },
          true,
          ["sign", "verify"]
        );
      } else {
        const curve = form.keySize === 256 ? "P-256" : form.keySize === 384 ? "P-384" : "P-521";
        keyPair = await crypto.subtle.generateKey(
          { name: "ECDSA", namedCurve: curve },
          true,
          ["sign", "verify"]
        );
      }

      // Export public key as SPKI
      const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey);

      // Build RDN sequences
      const rdns: Uint8Array[] = [];
      const attrs: [string, string][] = [
        [OID.c, form.country],
        [OID.st, form.state],
        [OID.l, form.locality],
        [OID.o, form.organization],
        [OID.ou, form.orgUnit],
        [OID.cn, form.commonName],
        [OID.email, form.email]
      ];
      for (const [oid, val] of attrs) {
        const rdn = buildRdn(oid, val);
        if (rdn) rdns.push(rdn);
      }

      const subject = derSequence(...rdns);
      const version = derInteger(0);
      const spkiBytes = new Uint8Array(spki);
      const subjectPublicKeyInfo = derSequence(...unwrapSequence(spkiBytes));
      const certReqInfo = derSequence(version, subject, subjectPublicKeyInfo);

      // Sign
      const signAlgo = form.keyAlgo === "RSA"
        ? { name: "RSASSA-PKCS1-v1_5" }
        : { name: "ECDSA", hash: form.hashAlgo };
      const signature = await crypto.subtle.sign(signAlgo, keyPair.privateKey, certReqInfo as BufferSource);

      // Hash algorithm OID
      const hashOid = form.hashAlgo === "SHA-256" ? "1.2.840.113549.1.1.11"
        : form.hashAlgo === "SHA-384" ? "1.2.840.113549.1.1.12"
        : "1.2.840.113549.1.1.13";

      const sigAlgo = form.keyAlgo === "RSA"
        ? derSequence(derOid(hashOid), derTag(0x05, new Uint8Array([0])))
        : derSequence(derOid(
            form.hashAlgo === "SHA-256" ? "1.2.840.10045.4.3.2"
            : form.hashAlgo === "SHA-384" ? "1.2.840.10045.4.3.3"
            : "1.2.840.10045.4.3.4"
          ));

      const csr = derSequence(certReqInfo, sigAlgo, derBitString(new Uint8Array(signature)));
      const csrArray = new ArrayBuffer(csr.byteLength);
      new Uint8Array(csrArray).set(csr);
      setCsrPem(bufToPem(csrArray, "CERTIFICATE REQUEST"));

      // Export private key
      const privKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
      setPrivKeyPem(bufToPem(privKey, "PRIVATE KEY"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }

  function unwrapSequence(bytes: Uint8Array): Uint8Array[] {
    // Skip SEQUENCE tag + length, return inner content as-is wrapped in a virtual sequence
    if (bytes[0] === 0x30) {
      return [bytes];
    }
    return [bytes];
  }

  async function handleCopy(type: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  }

  const fields: { key: keyof FormState; label: string; placeholder: string }[] = [
    { key: "commonName", label: "Common Name (CN)", placeholder: "example.com" },
    { key: "organization", label: "Organization (O)", placeholder: "My Company" },
    { key: "orgUnit", label: "Org Unit (OU)", placeholder: "IT Department" },
    { key: "locality", label: "Locality (L)", placeholder: "Beijing" },
    { key: "state", label: "State (ST)", placeholder: "Beijing" },
    { key: "country", label: "Country (C)", placeholder: "CN" },
    { key: "email", label: "Email", placeholder: "admin@example.com" }
  ];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">SSL/TLS</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>密钥算法</span>
          <select value={form.keyAlgo} onChange={(e) => update("keyAlgo", e.target.value)}>
            <option value="ECDSA">ECDSA（推荐）</option>
            <option value="RSA">RSA</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>{form.keyAlgo === "RSA" ? "密钥长度" : "曲线"}</span>
          {form.keyAlgo === "RSA" ? (
            <select value={form.keySize} onChange={(e) => update("keySize", Number(e.target.value))}>
              <option value={2048}>2048 bit</option>
              <option value={4096}>4096 bit</option>
            </select>
          ) : (
            <select value={form.keySize} onChange={(e) => update("keySize", Number(e.target.value))}>
              <option value={256}>P-256</option>
              <option value={384}>P-384</option>
              <option value={521}>P-521</option>
            </select>
          )}
        </label>
        <label className="tool-field tool-field--compact">
          <span>签名哈希</span>
          <select value={form.hashAlgo} onChange={(e) => update("hashAlgo", e.target.value)}>
            <option value="SHA-256">SHA-256</option>
            <option value="SHA-384">SHA-384</option>
            <option value="SHA-512">SHA-512</option>
          </select>
        </label>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        {fields.map((f) => (
          <label key={f.key} className="tool-field tool-field--compact">
            <span>{f.label}</span>
            <input
              value={form[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              spellCheck={false}
            />
          </label>
        ))}
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => void handleGenerate()} disabled={generating}>
          {generating ? "生成中…" : "生成 CSR"}
        </button>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}

      {csrPem ? (
        <>
          <label className="tool-field">
            <span>CSR（证书签名请求）</span>
            <textarea value={csrPem} readOnly rows={8} spellCheck={false} />
          </label>
          <div className="tool-toolbar">
            <button type="button" onClick={() => void handleCopy("csr", csrPem)}>
              {copied === "csr" ? "已复制" : "复制 CSR"}
            </button>
          </div>
        </>
      ) : null}

      {privKeyPem ? (
        <>
          <label className="tool-field">
            <span>私钥（请妥善保管）</span>
            <textarea value={privKeyPem} readOnly rows={8} spellCheck={false} />
          </label>
          <div className="tool-toolbar">
            <button type="button" onClick={() => void handleCopy("key", privKeyPem)}>
              {copied === "key" ? "已复制" : "复制私钥"}
            </button>
          </div>
        </>
      ) : null}

      <p className="tool-note">
        使用 Web Crypto API 在浏览器本地生成密钥对和 CSR。私钥不会离开您的浏览器。生成结果可直接用于 SSL 证书申请。
      </p>
    </section>
  );
}
