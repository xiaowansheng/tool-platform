"use client";

import { useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const HTML_SAMPLE = `<!DOCTYPE html>
<html><head><title>Demo Page</title>
<style>body { background-color: #f3f4f6; color: #111827; }
h1 { font-size: 2rem; }</style>
</head>
<body>
<div class="container">
<h1>Welcome to Tool Platform</h1>
<p>Format or minify HTML, CSS, and JS code snippets instantly.</p>
<ul>
<li>Fast</li>
<li>Fully Local</li>
<li>Secure</li>
</ul>
</div>
<script>
const message = "Ready!";
console.log(message);
</script>
</body></html>`;

const CSS_SAMPLE = `body{margin:0;padding:0;font-family:sans-serif;background-color:#1e293b}
.card{background:rgba(255,255,255,0.05);border-radius:12px;border:1px solid rgba(255,255,255,0.1)}
.card:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(0,0,0,0.2)}
button.btn-primary{background-color:var(--accent-primary);color:#fff;border-radius:6px;font-weight:600}
button.btn-primary:hover{filter:brightness(1.1)}
`;

const JS_SAMPLE = `// 计算阶乘与平方
function factorial(n){if(n===0||n===1){return 1;}
return n*factorial(n-1);}
const square = (x) => {
return x * x;
};
console.log("5的阶乘是:", factorial(5));
const numbers = [1,2,3,4,5];
const squares = numbers.map(num => square(num));
console.log("平方数数组:", squares);`;

// 1. HTML Formatter & Minifier
function minifyHTML(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .replace(/>\s+</g, "><") // Remove spaces between tags
    .trim();
}

function formatHTML(html: string): string {
  let formatted = "";
  const reg = /(<\/?[a-zA-Z0-9\t\r\n\s"=-_]+>)/g;
  const parts = html.split(reg);
  let indent = 0;
  const selfClosingTags = ["img", "br", "hr", "input", "link", "meta", "!doctype"];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    if (part.startsWith("</")) {
      // Close tag
      indent = Math.max(0, indent - 1);
      formatted += "\n" + "  ".repeat(indent) + part;
    } else if (part.startsWith("<") && !part.startsWith("<!") && !part.endsWith("/>")) {
      // Check if it's a self-closing tag name
      const tagNameMatch = part.match(/^<([a-zA-Z0-9!]+)/);
      const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : "";
      const isSelfClosing = selfClosingTags.includes(tagName);

      formatted += "\n" + "  ".repeat(indent) + part;
      if (!isSelfClosing) {
        indent++;
      }
    } else {
      // Text nodes or comment / self-closing markup
      formatted += "\n" + "  ".repeat(indent) + part;
    }
  }
  return formatted.trim();
}

// 2. CSS Formatter & Minifier
function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove CSS comments
    .replace(/\s*([{}|:;,])\s*/g, "$1") // Remove spaces around braces and colons
    .replace(/\s+/g, " ") // Collapse whitespaces
    .trim();
}

function formatCSS(css: string): string {
  let formatted = "";
  let indent = 0;
  const clean = minifyCSS(css);

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === "{") {
      indent++;
      formatted += " {\n" + "  ".repeat(indent);
    } else if (char === "}") {
      indent = Math.max(0, indent - 1);
      formatted = formatted.trimEnd();
      formatted += "\n" + "  ".repeat(indent) + "}\n\n" + "  ".repeat(indent);
    } else if (char === ";") {
      formatted += ";\n" + "  ".repeat(indent);
    } else if (char === ",") {
      formatted += ", ";
    } else if (char === ":") {
      formatted += ": ";
    } else {
      formatted += char;
    }
  }
  return formatted.replace(/\n\s*\n/g, "\n").trim();
}

// 3. JS Formatter & Minifier
function minifyJS(js: string): string {
  let clean = js.replace(/\/\*[\s\S]*?\*\//g, ""); // Remove block comments
  // Remove single line comments line-by-line
  clean = clean
    .split("\n")
    .map((line) => {
      const parts = line.split("//");
      return parts[0];
    })
    .join("\n");

  return clean
    .replace(/\s+/g, " ") // Collapse spaces
    .replace(/\s*([{}()\[\]=+\-*/&|;:,<>])\s*/g, "$1") // Remove spaces around punctuation
    .trim();
}

function formatJS(js: string): string {
  let indent = 0;
  let formatted = "";
  const lines = js.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Un-indent for closing brackets before printing line
    if (line.startsWith("}") || line.startsWith("]")) {
      indent = Math.max(0, indent - 1);
    }

    formatted += "  ".repeat(indent) + line + "\n";

    // Count braces in this line
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    const openBrackets = (line.match(/\[/g) || []).length;
    const closeBrackets = (line.match(/\]/g) || []).length;

    indent += (openBraces - closeBraces) + (openBrackets - closeBrackets);
    if (indent < 0) indent = 0;
  }
  return formatted.trim();
}

export default function CodeBeautifierTool({ manifest }: ToolAppProps) {
  const [lang, setLang] = useState<"html" | "css" | "js">("html");
  const [input, setInput] = useState(HTML_SAMPLE);
  const [output, setOutput] = useState(() => formatHTML(HTML_SAMPLE));
  const [copied, setCopied] = useState(false);

  const handleLangChange = (selectedLang: "html" | "css" | "js") => {
    setLang(selectedLang);
    setCopied(false);
    
    // Set appropriate sample
    let sample = HTML_SAMPLE;
    let formatted = "";
    if (selectedLang === "css") {
      sample = CSS_SAMPLE;
      formatted = formatCSS(CSS_SAMPLE);
    } else if (selectedLang === "js") {
      sample = JS_SAMPLE;
      formatted = formatJS(JS_SAMPLE);
    } else {
      formatted = formatHTML(HTML_SAMPLE);
    }
    
    setInput(sample);
    setOutput(formatted);
  };

  const handleBeautify = () => {
    setCopied(false);
    if (lang === "html") {
      setOutput(formatHTML(input));
    } else if (lang === "css") {
      setOutput(formatCSS(input));
    } else {
      setOutput(formatJS(input));
    }
  };

  const handleMinify = () => {
    setCopied(false);
    if (lang === "html") {
      setOutput(minifyHTML(input));
    } else if (lang === "css") {
      setOutput(minifyCSS(input));
    } else {
      setOutput(minifyJS(input));
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setCopied(false);
  };

  const loadSample = () => {
    setCopied(false);
    if (lang === "css") {
      setInput(CSS_SAMPLE);
      setOutput(formatCSS(CSS_SAMPLE));
    } else if (lang === "js") {
      setInput(JS_SAMPLE);
      setOutput(formatJS(JS_SAMPLE));
    } else {
      setInput(HTML_SAMPLE);
      setOutput(formatHTML(HTML_SAMPLE));
    }
  };

  // Compression Stats Calculation
  const inputSize = new TextEncoder().encode(input).length;
  const outputSize = new TextEncoder().encode(output).length;
  const compressionRatio = inputSize > 0 ? ((1 - outputSize / inputSize) * 100).toFixed(1) : "0";

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">开发与调试</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Languages & Controls Toolbar */}
      <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", flex: 1 }}>
          <button
            type="button"
            className={lang === "html" ? "button--primary" : "button--secondary"}
            onClick={() => handleLangChange("html")}
          >
            HTML
          </button>
          <button
            type="button"
            className={lang === "css" ? "button--primary" : "button--secondary"}
            onClick={() => handleLangChange("css")}
          >
            CSS
          </button>
          <button
            type="button"
            className={lang === "js" ? "button--primary" : "button--secondary"}
            onClick={() => handleLangChange("js")}
          >
            JavaScript
          </button>
          <button type="button" className="button--secondary" onClick={loadSample}>
            重置示例
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="button--secondary" onClick={handleBeautify} disabled={!input}>
            美化排版
          </button>
          <button type="button" className="button--secondary" onClick={handleMinify} disabled={!input}>
            压缩混淆
          </button>
          <button type="button" className="button--danger" onClick={handleClear}>
            清空
          </button>
        </div>
      </div>

      {/* Data size comparison header */}
      <div
        className="detail-grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.8rem",
          marginBottom: "1rem"
        }}
      >
        <div className="detail-card" style={{ padding: "0.6rem" }}>
          <h3>原始大小</h3>
          <p>{inputSize} 字节</p>
        </div>
        <div className="detail-card" style={{ padding: "0.6rem" }}>
          <h3>处理后大小</h3>
          <p>{outputSize} 字节</p>
        </div>
        <div className="detail-card" style={{ padding: "0.6rem" }}>
          <h3>体积变化</h3>
          <p style={{ color: Number(compressionRatio) > 0 ? "var(--accent-primary)" : "inherit" }}>
            {Number(compressionRatio) > 0 ? `缩减 ${compressionRatio}%` : `${compressionRatio}%`}
          </p>
        </div>
      </div>

      {/* Main workspace */}
      <div className="workspace workspace--two-column">
        {/* Input pane */}
        <label className="tool-field">
          <span>输入源代码</span>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder={`在此处粘贴您的原始 ${lang.toUpperCase()} 代码...`}
            spellCheck={false}
            style={{ height: "340px", fontFamily: "monospace", resize: "vertical" }}
          />
        </label>

        {/* Output pane */}
        <label className="tool-field">
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            处理结果
            <button type="button" onClick={handleCopy} disabled={!output} style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", height: "auto" }}>
              {copied ? "已复制" : "复制"}
            </button>
          </span>
          <textarea
            value={output}
            readOnly
            placeholder="结果将在此处展示..."
            spellCheck={false}
            style={{ height: "340px", fontFamily: "monospace", resize: "vertical" }}
          />
        </label>
      </div>

      <p className="tool-note" style={{ marginTop: "1rem" }}>
        提示：该压缩与美化引擎基于精简的词法状态扫描规则在您本地运行，速度极快，适合处理中小型的配置和代码片段。
      </p>
    </section>
  );
}
