"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import { Converter } from "opencc-js";

// Cache for Converter instances to optimize performance
const converterCache: Record<string, (text: string) => string> = {};

function getConverter(from: string, to: string): (text: string) => string {
  const key = `${from}-${to}`;
  if (!converterCache[key]) {
    try {
      converterCache[key] = Converter({
        from: from as any,
        to: to as any
      });
    } catch (e) {
      console.error(`Failed to create opencc converter from ${from} to ${to}:`, e);
      // Fallback: return original text
      return (text: string) => text;
    }
  }
  return converterCache[key];
}

type ModeId = "s2t" | "t2s" | "s2tw" | "tw2s" | "s2twp" | "twp2s" | "s2hk" | "hk2s";

interface ModeOption {
  id: ModeId;
  label: string;
  from: string;
  to: string;
  description: string;
}

const MODES: ModeOption[] = [
  {
    id: "s2twp",
    label: "大陆简体 ➔ 台湾正体 (含词汇习惯)",
    from: "cn",
    to: "twp",
    description: "转换文字并替换地区常用词汇（例如：鼠标 ➔ 滑鼠、软件 ➔ 軟體、内存 ➔ 記憶體）"
  },
  {
    id: "twp2s",
    label: "台湾正体 ➔ 大陆简体 (含词汇习惯)",
    from: "twp",
    to: "cn",
    description: "转换文字并替换地区常用词汇（例如：滑鼠 ➔ 鼠标、軟體 ➔ 软件、記憶體 ➔ 内存）"
  },
  {
    id: "s2t",
    label: "简体 ➔ 繁体 (仅字形)",
    from: "cn",
    to: "t",
    description: "将简体汉字直接转换为对应的繁体汉字，不进行词汇替换"
  },
  {
    id: "t2s",
    label: "繁体 ➔ 简体 (仅字形)",
    from: "t",
    to: "cn",
    description: "将繁体汉字直接转换为对应的简体汉字，不进行词汇替换"
  },
  {
    id: "s2tw",
    label: "简体 ➔ 台湾正体 (仅字形)",
    from: "cn",
    to: "tw",
    description: "将简体汉字直接转换为台湾标准正体，不进行词汇替换"
  },
  {
    id: "tw2s",
    label: "台湾正体 ➔ 简体 (仅字形)",
    from: "tw",
    to: "cn",
    description: "将台湾标准正体直接转换为简体，不进行词汇替换"
  },
  {
    id: "s2hk",
    label: "简体 ➔ 香港繁体 (仅字形)",
    from: "cn",
    to: "hk",
    description: "将简体汉字转换为香港标准繁体，不进行词汇替换"
  },
  {
    id: "hk2s",
    label: "香港繁体 ➔ 简体 (仅字形)",
    from: "hk",
    to: "cn",
    description: "将香港标准繁体字直接转换为简体，不进行词汇替换"
  }
];

// Terminology examples for localized previews
const TERM_EXAMPLES: Record<string, { cn: string; tw: string; desc: string }[]> = {
  taiwan: [
    { cn: "软件 / 硬件", tw: "軟體 / 硬體", desc: "Software / Hardware" },
    { cn: "鼠标 / 键盘", tw: "滑鼠 / 鍵盤", desc: "Mouse / Keyboard" },
    { cn: "内存 / 硬盘", tw: "記憶體 / 硬碟", desc: "Memory / Hard Drive" },
    { cn: "互联网 / 网络", tw: "網際網路 / 網路", desc: "Internet / Network" },
    { cn: "服务器 / 客户端", tw: "伺服器 / 用戶端", desc: "Server / Client" },
    { cn: "数据库 / 算法", tw: "資料庫 / 演算法", desc: "Database / Algorithm" },
    { cn: "设置 / 程序", tw: "設定 / 程式", desc: "Settings / Program" },
    { cn: "视频 / 音频", tw: "影片 / 音訊", desc: "Video / Audio" }
  ]
};

export default function ChineseConverterTool({ manifest }: ToolAppProps) {
  const [input, setInput] = useState("你好，欢迎使用中文简繁转换工具！你可以测试输入一些术语，比如：我们在服务器的数据库中安装了最新的杀毒软件，并用鼠标操作设置了内存和网络。");
  const [output, setOutput] = useState("");
  const [modeId, setModeId] = useState<ModeId>("s2twp");
  const [autoConvert, setAutoConvert] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [showHelper, setShowHelper] = useState(true);

  const selectedMode = MODES.find((m) => m.id === modeId) || MODES[0];

  // Perform translation
  const performTranslation = (textToConvert: string, currentMode: ModeOption) => {
    if (!textToConvert) {
      setOutput("");
      return;
    }
    try {
      const convert = getConverter(currentMode.from, currentMode.to);
      const result = convert(textToConvert);
      setOutput(result);
    } catch (e) {
      console.error("Conversion error:", e);
    }
  };

  // Convert on input or mode change
  useEffect(() => {
    if (autoConvert) {
      performTranslation(input, selectedMode);
    }
  }, [input, modeId, autoConvert]);

  const handleManualConvert = () => {
    performTranslation(input, selectedMode);
  };

  // Swap input and output, and reverse the mode
  const handleSwap = () => {
    if (!output && !input) return;

    // Determine opposite mode
    let nextModeId: ModeId = modeId;
    if (modeId === "s2twp") nextModeId = "twp2s";
    else if (modeId === "twp2s") nextModeId = "s2twp";
    else if (modeId === "s2t") nextModeId = "t2s";
    else if (modeId === "t2s") nextModeId = "s2t";
    else if (modeId === "s2tw") nextModeId = "tw2s";
    else if (modeId === "tw2s") nextModeId = "s2tw";
    else if (modeId === "s2hk") nextModeId = "hk2s";
    else if (modeId === "hk2s") nextModeId = "s2hk";

    setInput(output);
    setOutput(input);
    setModeId(nextModeId);
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
  };

  const copyToClipboard = async (text: string, isInput: boolean) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (isInput) {
        setCopiedInput(true);
        setTimeout(() => setCopiedInput(false), 2000);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Calculate character stats
  const charCount = input.length;
  const chineseCharCount = (input.match(/[\u4e00-\u9fa5]/g) || []).length;
  const lineCount = input ? input.split("\n").length : 0;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本与编码</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Control Bar */}
      <div 
        className="tool-toolbar"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          background: "var(--bg-muted)",
          padding: "1rem",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          marginBottom: "1.5rem"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "260px", flex: 1 }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 500 }}>选择转换模式</label>
          <select
            value={modeId}
            onChange={(e) => setModeId(e.target.value as ModeId)}
            className="tool-field"
            style={{
              padding: "0.5rem",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--text-primary)",
              cursor: "pointer",
              outline: "none"
            }}
          >
            {MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignSelf: "flex-end" }}>
          <button 
            type="button" 
            className="button--secondary" 
            onClick={handleSwap}
            title="互换输入与输出，并反转方向"
            style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            🔄 互换方向
          </button>
          
          {!autoConvert && (
            <button 
              type="button" 
              className="button--primary" 
              onClick={handleManualConvert}
              disabled={!input}
            >
              🚀 立即转换
            </button>
          )}

          <button 
            type="button" 
            className="button--danger" 
            onClick={handleClear}
            disabled={!input && !output}
          >
            🧹 清空
          </button>
        </div>
      </div>

      {/* Settings Row */}
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem",
          padding: "0 0.25rem"
        }}
      >
        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          💡 <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>当前规则：</span>
          {selectedMode.description}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={autoConvert}
            onChange={(e) => setAutoConvert(e.target.checked)}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          实时自动转换
        </label>
      </div>

      {/* Dual Panel Workspace */}
      <div 
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem",
          marginBottom: "1.5rem"
        }}
      >
        {/* Source Text Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>输入文本</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="button--secondary"
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                onClick={() => copyToClipboard(input, true)}
                disabled={!input}
              >
                {copiedInput ? "已复制" : "复制"}
              </button>
            </div>
          </div>
          <div style={{ position: "relative", flex: 1 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请输入或粘贴需要转换的中文内容..."
              spellCheck={false}
              style={{
                width: "100%",
                height: "280px",
                minHeight: "200px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.8rem",
                fontSize: "0.95rem",
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                lineHeight: "1.6",
                resize: "vertical",
                outline: "none"
              }}
            />
          </div>
          {/* Stats */}
          <div 
            style={{
              display: "flex",
              gap: "1rem",
              fontSize: "0.8rem",
              color: "var(--text-tertiary)",
              background: "var(--bg-muted)",
              padding: "0.4rem 0.8rem",
              borderRadius: "4px"
            }}
          >
            <span>总字数: {charCount}</span>
            <span>中文字数: {chineseCharCount}</span>
            <span>行数: {lineCount}</span>
          </div>
        </div>

        {/* Target Text Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>转换结果</span>
            <button
              type="button"
              className="button--secondary"
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
              onClick={() => copyToClipboard(output, false)}
              disabled={!output}
            >
              {copied ? "已复制" : "复制结果"}
            </button>
          </div>
          <div style={{ position: "relative", flex: 1 }}>
            <textarea
              readOnly
              value={output}
              placeholder="转换结果将在此实时显示..."
              spellCheck={false}
              style={{
                width: "100%",
                height: "280px",
                minHeight: "200px",
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.8rem",
                fontSize: "0.95rem",
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                lineHeight: "1.6",
                resize: "vertical",
                outline: "none"
              }}
            />
          </div>
          <div 
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.8rem",
              color: "var(--text-tertiary)",
              padding: "0.4rem 0.2rem"
            }}
          >
            <span>转换字数: {output.length}</span>
            <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => copyToClipboard(output, false)}>
              {output ? "💡 点击一键复制完整结果" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Terminology Guide for L10n Conversion */}
      {(modeId === "s2twp" || modeId === "twp2s") && (
        <div 
          className="detail-card" 
          style={{ 
            marginTop: "1.5rem",
            background: "linear-gradient(to right, var(--bg-card), var(--bg-muted))",
            border: "1px dashed var(--border)",
            padding: "1.2rem"
          }}
        >
          <div 
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              cursor: "pointer",
              marginBottom: showHelper ? "0.8rem" : "0"
            }}
            onClick={() => setShowHelper(!showHelper)}
          >
            <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.95rem" }}>
              🛠️ 常用开发/科技术语简繁对照参考
            </h4>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {showHelper ? "[ 收起 ]" : "[ 展开 ]"}
            </span>
          </div>

          {showHelper && (
            <div 
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "0.8rem"
              }}
            >
              {TERM_EXAMPLES.taiwan.map((item, index) => (
                <div 
                  key={index}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "0.6rem 0.8rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{item.cn}</span>
                    <span style={{ color: "var(--text-tertiary)" }}>➔</span>
                    <span style={{ color: "var(--accent)", fontWeight: 500 }}>{item.tw}</span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", fontStyle: "italic" }}>
                    {item.desc}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="tool-note" style={{ marginTop: "1rem" }}>
        ⚠️ <b>注意：</b> 词汇转换（如「软件」 ➔ 「軟體」）适用于科技、互联网与常用计算机术语。对于文学、诗词等不需要习惯用语转换的场景，请选择<b>「仅字形」</b>模式，以获得最精确的字对字简繁转换。
      </div>
    </section>
  );
}
