"use client";

import { useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

import ColorPickerTab from "./components/picker";
import ColorConverterTab from "./components/converter";
import ColorPaletteTab from "./components/palette";
import ColorHarmoniesTab from "./components/harmonies";
import ColorExtractorTab from "./components/extractor";
import ColorContrastTab from "./components/contrast";
import ColorBlindnessTab from "./components/blindness";
import ColorGradientTab from "./components/gradient";

type StudioTab = 
  | "picker"
  | "converter"
  | "palette"
  | "harmonies"
  | "extractor"
  | "contrast"
  | "blindness"
  | "gradient";

export default function ColorStudioTool({ manifest }: ToolAppProps) {
  const [activeColor, setActiveColor] = useState("#5eead4");
  const [activeTab, setActiveTab] = useState<StudioTab>("picker");

  const tabs: Array<{ id: StudioTab; label: string }> = [
    { id: "picker", label: "取色与色板" },
    { id: "converter", label: "格式转换" },
    { id: "palette", label: "色阶生成" },
    { id: "harmonies", label: "配色方案" },
    { id: "extractor", label: "提取颜色" },
    { id: "contrast", label: "对比度" },
    { id: "blindness", label: "色盲模拟" },
    { id: "gradient", label: "渐变与Token" }
  ];

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">设计工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Shared Active Color Quick Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "var(--bg-muted)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "10px 16px",
        marginBottom: "20px"
      }}>
        <div style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: activeColor,
          border: "2px solid white",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }} />
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>当前活跃颜色:</span>
        <span style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "0.95rem" }}>{activeColor}</span>
      </div>

      <div className="segmented-control" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "24px", background: "none", padding: 0 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              fontWeight: 500,
              flex: "1 0 auto",
              textAlign: "center"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="studio-tab-content" style={{ minHeight: "350px" }}>
        {activeTab === "picker" && (
          <ColorPickerTab activeColor={activeColor} onChangeColor={setActiveColor} />
        )}
        {activeTab === "converter" && (
          <ColorConverterTab activeColor={activeColor} onChangeColor={setActiveColor} />
        )}
        {activeTab === "palette" && (
          <ColorPaletteTab activeColor={activeColor} onChangeColor={setActiveColor} />
        )}
        {activeTab === "harmonies" && (
          <ColorHarmoniesTab activeColor={activeColor} onChangeColor={setActiveColor} />
        )}
        {activeTab === "extractor" && (
          <ColorExtractorTab activeColor={activeColor} onChangeColor={setActiveColor} />
        )}
        {activeTab === "contrast" && (
          <ColorContrastTab activeColor={activeColor} onChangeColor={setActiveColor} />
        )}
        {activeTab === "blindness" && (
          <ColorBlindnessTab activeColor={activeColor} onChangeColor={setActiveColor} />
        )}
        {activeTab === "gradient" && (
          <ColorGradientTab activeColor={activeColor} onChangeColor={setActiveColor} />
        )}
      </div>
    </section>
  );
}
