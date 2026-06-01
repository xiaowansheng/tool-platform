"use client";

import { useState } from "react";

import type { ToolClientProps } from "@tool-platform/tool-contracts";

type Mode = "jwkToPem" | "pemToJwk" | "inspectCsr";

const samplePublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyi0H/DZRuHgKHhntwOkh
ohD/33ZCdXprqU5ZZGzxEgjLRQHZ5fkfPGwDoQqr2vx3FP4nAwbdC8D7gt1O6fto
FNK/qxTQNP7MjBMHs6nFjrR9io2EEBET1FdoKLsVdF8MJhwqBtn4jgV3ieMz9GPu
K7UkuFXx1oYaNVqui6r+9pYBrS4QwowEzBGOkdi/v2evx9D2kfuOPZzLsjZDbdka
ikAJ36N4kBqgCrKxwSo60P/UspBHE214NDA5BaQ1HgdakuJTfTuHl3truejITvLq
+YzGRMJUDtPpR8U5FH/SMJbyBP2h6yDf3XAZXVVWdqM0UGhXEAmYPTiYC3a8qEm8
gwIDAQAB
-----END PUBLIC KEY-----`;

const sampleCsr = `-----BEGIN CERTIFICATE REQUEST-----
MIICYzCCAUsCAQAwHjEcMBoGA1UEAwwTdG9vbC1wbGF0Zm9ybS5sb2NhbDCCASIw
DQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMotB/w2Ubh4Ch4Z7cDpIaIQ/992
QnV6a6lOWWRs8RIIy0UB2eX5HzxsA6EKq9r8dxT+JwMG3QvA+4LdTun7aBTSv6sU
0DT+zIwTB7OpxY60fYqNhBARE9RXaCi7FXRfDCYcKgbZ+I4Fd4njM/Rj7iu1JLhV
8daGGjVarouq/vaWAa0uEMKMBMwRjpHYv79nr8fQ9pH7jj2cy7I2Q23ZGopACd+j
eJAaoAqyscEqOtD/1LKQRxNteDQwOQWkNR4HWpLiU307h5d7a7noyE7y6vmMxkTC
VA7T6UfFORR/0jCW8gT9oesg391wGV1VVnajNFBoVxAJmD04mAt2vKhJvIMCAwEA
AaAAMA0GCSqGSIb3DQEBCwUAA4IBAQCqfg6G0t2dV3HCZ1lYv0Cl+qSVg9/NP1W3
FISb7gI4qoBhIHZhMT/vLS1GGDyY9JlTmZU1mJ5tZLc0hcryrC2FkEbtYGg1sztG
NYlsMuYgjxQtwahJZqUHewNhgo8idZW9KB/0EVM/iuzpeRbgudr60ALT6IhkmebY
ioOls6rJ6/VzFh4JWxLAf2pBphDgvPTqcWza4plqS1oiXelg7AfwEAUi0kfgMAUP
gfWd3aHkvW9ZuzcAiHU9qZ1FTXCHFlXKH1kBmllGt+pKPJFnAPuwQsMRt18wN/h0
pwjEGyxz3v36dxzDyA0zTDa/ql77n8qOV4uS9oMTT8trLexp6Lxn
-----END CERTIFICATE REQUEST-----`;

const sampleJwk = `{
  "key_ops": [
    "verify"
  ],
  "ext": true,
  "alg": "RS256",
  "kty": "RSA",
  "n": "yi0H_DZRuHgKHhntwOkhohD_33ZCdXprqU5ZZGzxEgjLRQHZ5fkfPGwDoQqr2vx3FP4nAwbdC8D7gt1O6ftoFNK_qxTQNP7MjBMHs6nFjrR9io2EEBET1FdoKLsVdF8MJhwqBtn4jgV3ieMz9GPuK7UkuFXx1oYaNVqui6r-9pYBrS4QwowEzBGOkdi_v2evx9D2kfuOPZzLsjZDbdkaikAJ36N4kBqgCrKxwSo60P_UspBHE214NDA5BaQ1HgdakuJTfTuHl3truejITvLq-YzGRMJUDtPpR8U5FH_SMJbyBP2h6yDf3XAZXVVWdqM0UGhXEAmYPTiYC3a8qEm8gw",
  "e": "AQAB"
}`;

const sampleByMode: Record<Mode, string> = {
  inspectCsr: sampleCsr,
  jwkToPem: sampleJwk,
  pemToJwk: samplePublicKey
};

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
  const [input, setInput] = useState(sampleByMode.inspectCsr);
  const [output, setOutput] = useState("");

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setInput(sampleByMode[nextMode]);
    setOutput("");
  }

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
          <p className="eyebrow">密钥工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>模式</span>
          <select value={mode} onChange={(event) => changeMode(event.target.value as Mode)}>
            <option value="inspectCsr">检查 CSR / PEM</option>
            <option value="jwkToPem">RSA JWK → PEM 公钥</option>
            <option value="pemToJwk">RSA PEM 公钥 → JWK</option>
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
