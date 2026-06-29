"use client";

import { useEffect, useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const sampleTokenHS256 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0b29sLXVzZXIiLCJleHAiOjE5MjE4OTYwMDB9.1X88snyije7kdMku-ClPzUTJ3x0tkzbL1NKbkhEAzBI";
const sampleSecretHS256 = "secret";

const sampleTokenRS256 = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJyczI1Ni10ZXN0ZXIiLCJleHAiOjE5MjE4OTYwMDAsIm5hbWUiOiJBbGljZSBSUyJ9.TfUh92XxqH-iAdGwF4rKqcTN63D-xOZsft3TbXZPz-GcwCQczephtDL1EVJcXQ6NJjIoSjOtyxJ-Tsry1kQpWT4Y76B4NkvWZobb44ONzzitGn5G6k1vNh0U1-djSG16n_G82bTlhVm0ZI-sFbxKQaARtUDc4tS1EcG06Eew0Tvyo6aDq8ndcsL6TNi7vtIy6WnjPkdzftYkbID2VyE3QIyPN7gnd2ZZvfNlSszU-CAVk2ebcs_YhbBooCHum8kdgR4OfAhw5rV5raxDch4VDhlBu9iHbJGKY5UzmSH2bwd6ns7DPFR3g3e1YFt6r0hpjYwpjOByLDMMnqn1RO2YVg";

const samplePemRS256 = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy9BwT67+L4SnOt15+UvB
+OsIZuQI1R45yathog8I5+Zx4HgF05AovDCpjpsAIuBC42TDura2bYNjSrWcRSGS
6ViSqyKc0/tnMCTq6eI89GtoLvIZGYmBUw3iA2jJQVKvttGJRADmSXmKC2WKRJCY
UIJDLRdcMuYfEVrzdKUBAPt9UXmAk8ACqGcsjFYvw6OB8xGFL592jthwZ5/fBtir
hzxyXEZGfmIlus11RVRd7w8ZY2NdnYiY+t1qPva07RLckdFlpFz/NdNWKygSGbG6
2p9ktLF1VVx0cm7oEwMxWT8CAMHiHtCF9niMEQfbfo4gcmaswUWwlJGWjCMF+LfD
2wIDAQAB
-----END PUBLIC KEY-----`;

const sampleJwkRS256 = `{
  "kty": "RSA",
  "n": "y9BwT67-L4SnOt15-UvB-OsIZuQI1R45yathog8I5-Zx4HgF05AovDCpjpsAIuBC42TDura2bYNjSrWcRSGS6ViSqyKc0_tnMCTq6eI89GtoLvIZGYmBUw3iA2jJQVKvttGJRADmSXmKC2WKRJCYUIJDLRdcMuYfEVrzdKUBAPt9UXmAk8ACqGcsjFYvw6OB8xGFL592jthwZ5_fBtirhzxyXEZGfmIlus11RVRd7w8ZY2NdnYiY-t1qPva07RLckdFlpFz_NdNWKygSGbG62p9ktLF1VVx0cm7oEwMxWT8CAMHiHtCF9niMEQfbfo4gcmaswUWwlJGWjCMF-LfD2w",
  "e": "AQAB"
}`;

const sampleTokenES256 = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlczI1Ni10ZXN0ZXIiLCJleHAiOjE5MjE4OTYwMDAsIm5hbWUiOiJCb2IgRVMifQ.MEUCIQCKEjqFbMA1zJrABifU1MuewsWSivDCJVG_88NRaBk-LAIgBzA4mVy047eklRcaIu2v5XCGG_6vu01IDfcDqOoqn2I";

const samplePemES256 = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEfdZiTomWq+9hlyaZoqB/BFBGAonz
gpQ1dYgVyM8tuBbIEeRljhf1iw9mKIw00Ia5eRxGqjl7eJg+Fqcleytafg==
-----END PUBLIC KEY-----`;

const sampleJwkES256 = `{
  "kty": "EC",
  "x": "fdZiTomWq-9hlyaZoqB_BFBGAonzgpQ1dYgVyM8tuBY",
  "y": "yBHkZY4X9YsPZiiMNNCGuXkcRqo5e3iYPhanJXsrWn4",
  "crv": "P-256"
}`;

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64UrlToText(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

function pemToDer(pem: string): ArrayBuffer {
  const cleanPem = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  
  const binaryString = atob(cleanPem);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

interface ParsedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  signingInput: string;
}

function parseJwt(token: string): ParsedJwt {
  const [header = "", payload = "", signature = ""] = token.trim().split(".");
  if (!header || !payload || !signature) {
    throw new Error("JWT 格式不正确，必须包含以点号（.）分隔的 Header、Payload 和 Signature 三部分。");
  }
  return {
    header: JSON.parse(base64UrlToText(header)) as Record<string, unknown>,
    payload: JSON.parse(base64UrlToText(payload)) as Record<string, unknown>,
    signature,
    signingInput: `${header}.${payload}`
  };
}

async function verifyJwt(token: string, keyInput: string): Promise<boolean> {
  const parsed = parseJwt(token);
  const algorithm = String(parsed.header.alg ?? "").toUpperCase();
  const data = new TextEncoder().encode(parsed.signingInput);
  const signature = base64UrlToBytes(parsed.signature);

  // HMAC Symmetric Cryptography
  if (algorithm.startsWith("HS")) {
    let hashName = "SHA-256";
    if (algorithm === "HS384") hashName = "SHA-384";
    else if (algorithm === "HS512") hashName = "SHA-512";
    else if (algorithm !== "HS256") {
      throw new Error(`暂不支持的 HMAC 算法: ${algorithm}`);
    }

    const key = await crypto.subtle.importKey(
      "raw", 
      new TextEncoder().encode(keyInput), 
      { name: "HMAC", hash: hashName }, 
      false, 
      ["verify"]
    );
    return crypto.subtle.verify("HMAC", key, signature, data);
  }

  // RSA Asymmetric Cryptography (PKCS#1 v1.5)
  if (algorithm.startsWith("RS")) {
    let hashName = "SHA-256";
    if (algorithm === "RS384") hashName = "SHA-384";
    else if (algorithm === "RS512") hashName = "SHA-512";
    else if (algorithm !== "RS256") {
      throw new Error(`暂不支持的 RSA 算法: ${algorithm}`);
    }

    const isPem = keyInput.trim().includes("-----BEGIN");
    if (isPem) {
      const der = pemToDer(keyInput);
      const key = await crypto.subtle.importKey(
        "spki",
        der,
        { name: "RSASSA-PKCS1-v1_5", hash: hashName },
        false,
        ["verify"]
      );
      return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, data);
    } else {
      const jwk = JSON.parse(keyInput) as JsonWebKey;
      const key = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: hashName },
        false,
        ["verify"]
      );
      return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, data);
    }
  }

  // ECDSA Elliptic Curve Asymmetric Cryptography
  if (algorithm.startsWith("ES")) {
    let hashName = "SHA-256";
    let curve = "P-256";
    if (algorithm === "ES384") {
      hashName = "SHA-384";
      curve = "P-384";
    } else if (algorithm === "ES512") {
      hashName = "SHA-512";
      curve = "P-521";
    } else if (algorithm !== "ES256") {
      throw new Error(`暂不支持的 ECDSA 算法: ${algorithm}`);
    }

    const isPem = keyInput.trim().includes("-----BEGIN");
    if (isPem) {
      const der = pemToDer(keyInput);
      const key = await crypto.subtle.importKey(
        "spki",
        der,
        { name: "ECDSA", namedCurve: curve },
        false,
        ["verify"]
      );
      return crypto.subtle.verify({ name: "ECDSA", hash: hashName }, key, signature, data);
    } else {
      const jwk = JSON.parse(keyInput) as JsonWebKey;
      const key = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "ECDSA", namedCurve: curve },
        false,
        ["verify"]
      );
      return crypto.subtle.verify({ name: "ECDSA", hash: hashName }, key, signature, data);
    }
  }

  throw new Error(`尚不支持的验证算法 alg: ${algorithm}`);
}

function formatClaimDate(timestamp: unknown): string {
  if (typeof timestamp !== "number") return "格式错误";
  try {
    const d = new Date(timestamp * 1000);
    return d.toLocaleString();
  } catch {
    return "无效的时间戳";
  }
}

export default function JwtJwkVerifierTool({ manifest }: ToolAppProps) {
  const [token, setToken] = useState(sampleTokenHS256);
  const [keyInput, setKeyInput] = useState(sampleSecretHS256);
  const [verificationState, setVerificationState] = useState<"idle" | "valid" | "invalid" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Parse token details reactively
  const parsedToken = useMemo(() => {
    try {
      if (!token.trim()) return null;
      return parseJwt(token);
    } catch {
      return null;
    }
  }, [token]);

  const decodeError = useMemo(() => {
    if (!token.trim()) return "";
    try {
      parseJwt(token);
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : "JWT 解码失败，请检查格式";
    }
  }, [token]);

  const algorithm = useMemo(() => {
    return parsedToken ? String(parsedToken.header.alg ?? "未知") : "未知";
  }, [parsedToken]);

  // Check Expired / Claims
  const expiryCheck = useMemo(() => {
    if (!parsedToken || !parsedToken.payload) return null;
    const exp = parsedToken.payload.exp;
    const nbf = parsedToken.payload.nbf;
    const iat = parsedToken.payload.iat;

    if (typeof exp !== "number") {
      return { status: "missing", text: "未设置有效期 (无 exp)" };
    }

    const currentEpoch = Math.floor(Date.now() / 1000);
    const expired = currentEpoch > exp;
    
    let isNotActive = false;
    if (typeof nbf === "number" && currentEpoch < nbf) {
      isNotActive = true;
    }

    return {
      status: expired ? "expired" : isNotActive ? "inactive" : "active",
      text: expired 
        ? `⚠️ 已于 ${formatClaimDate(exp)} 过期`
        : isNotActive 
          ? `🔒 尚未生效 (nbf: ${formatClaimDate(nbf)})` 
          : `✅ 在有效期内 (将于 ${formatClaimDate(exp)} 过期)`,
      exp: formatClaimDate(exp),
      iat: typeof iat === "number" ? formatClaimDate(iat) : null,
      nbf: typeof nbf === "number" ? formatClaimDate(nbf) : null,
      rawExp: exp
    };
  }, [parsedToken]);

  // Auto verify effect
  useEffect(() => {
    if (!token.trim() || !keyInput.trim() || decodeError) {
      setVerificationState("idle");
      setErrorMessage("");
      return;
    }

    let isCurrent = true;
    const runVerification = async () => {
      try {
        const isValid = await verifyJwt(token, keyInput);
        if (isCurrent) {
          setVerificationState(isValid ? "valid" : "invalid");
          setErrorMessage("");
        }
      } catch (err) {
        if (isCurrent) {
          setVerificationState("error");
          setErrorMessage(err instanceof Error ? err.message : "签名校验发生异常");
        }
      }
    };

    // Small debounce or immediately verify
    runVerification();

    return () => {
      isCurrent = false;
    };
  }, [token, keyInput, decodeError]);

  const copyResults = async () => {
    let text = "";
    if (decodeError) {
      text = `JWT 解析错误: ${decodeError}`;
    } else {
      const sigStatus = {
        idle: "未校验签名",
        valid: "签名校验成功 (有效)",
        invalid: "签名校验失败 (无效)",
        error: `校验出错: ${errorMessage}`
      }[verificationState];

      text = `[JWT 验证结果]\n` +
             `算法 (alg): ${algorithm}\n` +
             `签名状态: ${sigStatus}\n` +
             `有效期检查: ${expiryCheck?.text ?? "无"}\n\n` +
             `--- HEADER ---\n${JSON.stringify(parsedToken?.header, null, 2)}\n\n` +
             `--- PAYLOAD ---\n${JSON.stringify(parsedToken?.payload, null, 2)}`;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  // Preset Loaders
  const loadExample = (type: "hs256" | "rs256_pem" | "rs256_jwk" | "es256_pem" | "es256_jwk") => {
    setCopied(false);
    if (type === "hs256") {
      setToken(sampleTokenHS256);
      setKeyInput(sampleSecretHS256);
    } else if (type === "rs256_pem") {
      setToken(sampleTokenRS256);
      setKeyInput(samplePemRS256);
    } else if (type === "rs256_jwk") {
      setToken(sampleTokenRS256);
      setKeyInput(sampleJwkRS256);
    } else if (type === "es256_pem") {
      setToken(sampleTokenES256);
      setKeyInput(samplePemES256);
    } else if (type === "es256_jwk") {
      setToken(sampleTokenES256);
      setKeyInput(sampleJwkES256);
    }
  };

  return (
    <section className="tool-panel">
      {/* Local custom styles block */}
      <style dangerouslySetInnerHTML={{ __html: `
        .jwt-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          width: 100%;
        }
        @media (min-width: 1024px) {
          .jwt-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .jwt-input-card, .jwt-decode-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .jwt-editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .jwt-colored-box {
          border-radius: var(--radius-md);
          border: 1px solid var(--border-default);
          overflow: hidden;
        }
        .jwt-colored-box__title {
          padding: 0.5rem 0.75rem;
          font-size: 0.78rem;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-default);
        }
        .jwt-colored-box__content {
          padding: 0.75rem;
          margin: 0;
          font-family: var(--font-mono), monospace;
          font-size: 0.85rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-all;
          max-height: 200px;
          overflow-y: auto;
          background: var(--bg-muted);
        }
        .jwt-colored-box--header {
          border-color: rgba(239, 68, 68, 0.25);
        }
        .jwt-colored-box--header .jwt-colored-box__title {
          background: rgba(239, 68, 68, 0.08);
          color: #ef4444;
        }
        .jwt-colored-box--payload {
          border-color: rgba(59, 130, 246, 0.25);
        }
        .jwt-colored-box--payload .jwt-colored-box__title {
          background: rgba(59, 130, 246, 0.08);
          color: #3b82f6;
        }
        .jwt-status-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
        }
        .jwt-status-banner--valid {
          background: rgba(34, 197, 94, 0.12);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }
        .jwt-status-banner--invalid {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .jwt-status-banner--error {
          background: rgba(249, 115, 22, 0.12);
          color: #f97316;
          border: 1px solid rgba(249, 115, 22, 0.25);
        }
        .jwt-status-banner--idle {
          background: var(--bg-muted);
          color: var(--text-secondary);
          border: 1px solid var(--border-default);
        }
      `}} />

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">安全与开发工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Examples presets list */}
      <div className="tool-toolbar tool-toolbar--grid" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>载入测试模板：</span>
          <button type="button" className="preset-btn" style={{ padding: "4px 10px", fontSize: "0.78rem" }} onClick={() => loadExample("hs256")}>HS256 (对称秘钥)</button>
          <button type="button" className="preset-btn" style={{ padding: "4px 10px", fontSize: "0.78rem" }} onClick={() => loadExample("rs256_pem")}>RS256 (PEM 公钥)</button>
          <button type="button" className="preset-btn" style={{ padding: "4px 10px", fontSize: "0.78rem" }} onClick={() => loadExample("rs256_jwk")}>RS256 (JWK 格式)</button>
          <button type="button" className="preset-btn" style={{ padding: "4px 10px", fontSize: "0.78rem" }} onClick={() => loadExample("es256_pem")}>ES256 (PEM 公钥)</button>
          <button type="button" className="preset-btn" style={{ padding: "4px 10px", fontSize: "0.78rem" }} onClick={() => loadExample("es256_jwk")}>ES256 (JWK 格式)</button>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="button--primary" onClick={copyResults}>
            {copied ? "已复制分析结果" : "复制全部结果"}
          </button>
        </div>
      </div>

      <div className="jwt-grid">
        {/* Left Column: Token and Keys input */}
        <div className="jwt-input-card">
          <div className="jwt-editor-header">
            <span>输入凭证 (Encoded Token)</span>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <textarea 
              value={token} 
              onChange={(event) => setToken(event.target.value)} 
              spellCheck={false}
              placeholder="在此粘贴 eyJhbGciOi... 编码后的 JWT"
              style={{ 
                minHeight: "160px",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.85rem",
                lineHeight: 1.5,
                borderColor: decodeError ? "#ef4444" : "var(--border-default)"
              }}
            />
            {decodeError && (
              <p style={{ color: "#ef4444", fontSize: "0.78rem", margin: "0.25rem 0 0 0" }}>
                ⚠️ {decodeError}
              </p>
            )}
          </div>

          <div className="jwt-editor-header" style={{ marginTop: "0.5rem" }}>
            <span>校验公钥 / 秘钥 (JWK, PEM Public Key, or raw HMAC secret)</span>
          </div>
          
          <textarea 
            value={keyInput} 
            onChange={(event) => setKeyInput(event.target.value)} 
            spellCheck={false}
            placeholder="HS 算法：在此输入对称密码（例如: secret）&#10;RS/ES 算法：在此粘贴 -----BEGIN PUBLIC KEY----- 公钥或 JWK 格式 JSON (例如: {&quot;kty&quot;:&quot;RSA&quot;,...})"
            style={{ 
              minHeight: "180px",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.85rem",
              lineHeight: 1.4
            }}
          />
        </div>

        {/* Right Column: Decoded values and verification stats */}
        <div className="jwt-decode-card">
          <div className="jwt-editor-header">
            <span>解密分析 (Decoded)</span>
          </div>

          {parsedToken ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Header Box */}
              <div className="jwt-colored-box jwt-colored-box--header">
                <div className="jwt-colored-box__title">Header: 算法 & 类型</div>
                <pre className="jwt-colored-box__content">{JSON.stringify(parsedToken.header, null, 2)}</pre>
              </div>

              {/* Payload Box */}
              <div className="jwt-colored-box jwt-colored-box--payload">
                <div className="jwt-colored-box__title">Payload: 声明内容</div>
                <pre className="jwt-colored-box__content">{JSON.stringify(parsedToken.payload, null, 2)}</pre>
              </div>
            </div>
          ) : (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              minHeight: "180px",
              border: "2px dashed var(--border-default)", 
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: "0.875rem"
            }}>
              {token.trim() ? "等待输入正确的 JWT 令牌格式..." : "请在左侧输入 JWT 以开始自动解析..."}
            </div>
          )}

          {/* Validation Metrics dashboard */}
          <div className="detail-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem" }}>
            <article className="detail-card">
              <h3>校验算法</h3>
              <p className="mono-output" style={{ fontSize: "1.1rem" }}>{algorithm}</p>
            </article>
            <article className="detail-card">
              <h3>有效状态</h3>
              <p style={{ 
                fontSize: "0.825rem", 
                color: expiryCheck?.status === "expired" ? "#ef4444" : expiryCheck?.status === "active" ? "#22c55e" : "var(--text-secondary)"
              }}>
                {expiryCheck?.text ?? "不适用"}
              </p>
            </article>
            <article className="detail-card">
              <h3>签名校验</h3>
              <p style={{ 
                fontSize: "0.875rem", 
                fontWeight: "bold",
                color: verificationState === "valid" ? "#22c55e" : verificationState === "invalid" ? "#ef4444" : "#f97316"
              }}>
                {{
                  idle: "未校验",
                  valid: "有效签名",
                  invalid: "无效签名",
                  error: "验证错误"
                }[verificationState]}
              </p>
            </article>
          </div>

          {/* Detailed Verification Status Banner */}
          {token.trim() && keyInput.trim() && (
            <div className={`jwt-status-banner ${
              verificationState === "valid" 
                ? "jwt-status-banner--valid" 
                : verificationState === "invalid" 
                  ? "jwt-status-banner--invalid" 
                  : verificationState === "error" 
                    ? "jwt-status-banner--error" 
                    : "jwt-status-banner--idle"
            }`}>
              {verificationState === "valid" && (
                <span>✓ 签名验证成功。数据完整性与来源已确认。</span>
              )}
              {verificationState === "invalid" && (
                <span>✗ 签名无效。Token 内容可能被篡改或验证密钥不匹配。</span>
              )}
              {verificationState === "error" && (
                <span>⚠ 签名校验失败: {errorMessage}</span>
              )}
              {verificationState === "idle" && (
                <span>⏳ 正在进行本地签名验证...</span>
              )}
            </div>
          )}

          {/* Time claims breakdown */}
          {expiryCheck && (
            <div style={{ 
              fontSize: "0.78rem", 
              background: "var(--bg-muted)", 
              padding: "0.75rem", 
              borderRadius: "var(--radius-md)", 
              border: "1px solid var(--border-default)",
              display: "flex", 
              flexDirection: "column", 
              gap: "0.35rem",
              color: "var(--text-secondary)" 
            }}>
              {expiryCheck.iat && (
                <div>签发时间 (iat): <span className="mono-output" style={{ color: "var(--text-primary)" }}>{expiryCheck.iat}</span></div>
              )}
              {expiryCheck.nbf && (
                <div>生效时间 (nbf): <span className="mono-output" style={{ color: "var(--text-primary)" }}>{expiryCheck.nbf}</span></div>
              )}
              {expiryCheck.exp && (
                <div>过期时间 (exp): <span className="mono-output" style={{ color: "var(--text-primary)" }}>{expiryCheck.exp}</span></div>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: "1rem" }}>
        说明：本工具支持 HS256/384/512 (基于对称密匙)、RS256/384/512 (基于 RSA 公钥)、ES256/384/512 (基于椭圆曲线公钥)。
        所有签名校验及解密解析工作均在本地浏览器通过 Web Cryptography API 完成，不会上传任何数据至服务器，保证隐私安全。
      </p>
    </section>
  );
}
