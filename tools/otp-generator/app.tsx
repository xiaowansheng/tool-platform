"use client";

import { useState, useEffect, useCallback } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

function base32Decode(input: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = input.replace(/[\s=-]/g, "").toUpperCase();
  const bits: number[] = [];

  for (const char of cleaned) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    for (let i = 4; i >= 0; i--) {
      bits.push((index >> i) & 1);
    }
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(
      (bits[i]! << 7) | (bits[i + 1]! << 6) | (bits[i + 2]! << 5) |
      (bits[i + 3]! << 4) | (bits[i + 4]! << 3) | (bits[i + 5]! << 2) |
      (bits[i + 6]! << 1) | bits[i + 7]!
    );
  }

  return new Uint8Array(bytes);
}

async function computeHmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key as unknown as BufferSource, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, message as unknown as BufferSource);
  return new Uint8Array(signature);
}

function generateTotp(secret: string, digits: number = 6, period: number = 30): { code: string; remaining: number } {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / period);
  const remaining = period - (epoch % period);

  const counterBytes = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  // We need to do this async, but we'll use a sync approach
  // Return placeholder - actual computation is done in async wrapper
  return { code: "", remaining };
}

async function generateTotpAsync(secret: string, digits: number = 6, period: number = 30): Promise<{ code: string; remaining: number }> {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / period);
  const remaining = period - (epoch % period);

  const counterBytes = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const hmac = await computeHmacSha1(key, counterBytes);
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  const code = (binary % Math.pow(10, digits)).toString().padStart(digits, "0");
  return { code, remaining };
}

function generateRandomSecret(length: number = 20): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]!).join("");
}

export default function OtpGeneratorTool({ manifest }: ToolAppProps) {
  const [secret, setSecret] = useState("JBSWY3DPEHPK3PXP");
  const [digits, setDigits] = useState(6);
  const [period, setPeriod] = useState(30);
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(30);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const updateCode = useCallback(async () => {
    try {
      if (!secret.trim()) {
        setCode("");
        return;
      }
      const result = await generateTotpAsync(secret, digits, period);
      setCode(result.code);
      setRemaining(result.remaining);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP 生成失败");
    }
  }, [secret, digits, period]);

  useEffect(() => {
    void updateCode();
    const interval = setInterval(() => void updateCode(), 1000);
    return () => clearInterval(interval);
  }, [updateCode]);

  async function handleCopy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRandomSecret() {
    setSecret(generateRandomSecret());
    setCopied(false);
  }

  const progressPercent = (remaining / period) * 100;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">多因素认证</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar tool-toolbar--grid">
        <label className="tool-field tool-field--compact">
          <span>密钥 (Base32)</span>
          <input
            type="text"
            value={secret}
            onChange={(e) => { setSecret(e.target.value.toUpperCase()); setCopied(false); }}
            placeholder="JBSWY3DPEHPK3PXP"
            spellCheck={false}
          />
        </label>
        <label className="tool-field tool-field--compact">
          <span>位数</span>
          <select value={digits} onChange={(e) => setDigits(Number(e.target.value))}>
            <option value={6}>6 位</option>
            <option value={8}>8 位</option>
          </select>
        </label>
        <label className="tool-field tool-field--compact">
          <span>刷新周期</span>
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
            <option value={15}>15 秒</option>
            <option value={30}>30 秒</option>
            <option value={60}>60 秒</option>
          </select>
        </label>
      </div>

      <div className="detail-grid">
        <article className="detail-card" style={{ textAlign: "center" }}>
          <h3>当前 OTP</h3>
          <p style={{ fontSize: "2em", fontFamily: "monospace", letterSpacing: "0.3em" }}>
            {code || "------"}
          </p>
        </article>
        <article className="detail-card">
          <h3>剩余时间</h3>
          <p>{remaining} 秒</p>
          <div style={{
            height: "4px",
            background: "var(--border, #333)",
            borderRadius: "2px",
            marginTop: "8px",
            overflow: "hidden"
          }}>
            <div style={{
              height: "100%",
              width: `${progressPercent}%`,
              background: remaining <= 5 ? "var(--error, #ef4444)" : "var(--accent, #22c55e)",
              transition: "width 1s linear"
            }} />
          </div>
        </article>
      </div>

      <div className="tool-toolbar">
        <button type="button" className="button--primary" onClick={() => void handleCopy()} disabled={!code}>
          {copied ? "已复制" : "复制验证码"}
        </button>
        <button type="button" onClick={handleRandomSecret}>
          生成随机密钥
        </button>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}
      <p className="tool-note">
        密钥格式为 Base32 编码。兼容 Google Authenticator、Authy 等主流 TOTP 应用。
        所有计算在浏览器本地完成，密钥不会上传到任何服务器。
      </p>
    </section>
  );
}
