"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const NATO_ALPHABET: Record<string, string> = {
  a: "Alpha", b: "Bravo", c: "Charlie", d: "Delta", e: "Echo",
  f: "Foxtrot", g: "Golf", h: "Hotel", i: "India", j: "Juliet",
  k: "Kilo", l: "Lima", m: "Mike", n: "November", o: "Oscar",
  p: "Papa", q: "Quebec", r: "Romeo", s: "Sierra", t: "Tango",
  u: "Uniform", v: "Victor", w: "Whiskey", x: "X-ray", y: "Yankee",
  z: "Zulu"
};

const NATO_NUMBERS: Record<string, string> = {
  "0": "Zero", "1": "One", "2": "Two", "3": "Three", "4": "Four",
  "5": "Five", "6": "Six", "7": "Seven", "8": "Eight", "9": "Nine"
};

function textToNato(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((char) => {
      if (NATO_ALPHABET[char]) return NATO_ALPHABET[char];
      if (NATO_NUMBERS[char]) return NATO_NUMBERS[char];
      if (char === " ") return "(space)";
      return char;
    })
    .join(" ");
}

function natoToText(nato: string): string {
  const reverseMap: Record<string, string> = {};
  for (const [letter, word] of Object.entries(NATO_ALPHABET)) {
    reverseMap[word.toLowerCase()] = letter;
  }
  for (const [num, word] of Object.entries(NATO_NUMBERS)) {
    reverseMap[word.toLowerCase()] = num;
  }
  reverseMap["(space)"] = " ";

  return nato
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      return reverseMap[lower] ?? word;
    })
    .join("");
}

export default function NatoAlphabetConverterTool({ manifest }: ToolAppProps) {
  const [textInput, setTextInput] = useState("Hello World");
  const [natoOutput, setNatoOutput] = useState(() => textToNato("Hello World"));
  const [natoInput, setNatoInput] = useState("");
  const [textOutput, setTextOutput] = useState("");
  const [copied, setCopied] = useState("");

  function handleTextToNato() {
    setNatoOutput(textToNato(textInput));
    setCopied("");
  }

  function handleNatoToText() {
    setTextOutput(natoToText(natoInput));
    setCopied("");
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">语音编码</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--two-column">
        <div>
          <label className="tool-field">
            <span>文本</span>
            <textarea
              value={textInput}
              onChange={(e) => { setTextInput(e.target.value); setCopied(""); }}
              placeholder="输入文本..."
              spellCheck={false}
            />
          </label>
          <button type="button" className="button--primary" onClick={handleTextToNato} style={{ marginTop: "8px" }}>
            文本 → NATO
          </button>
          {natoOutput ? (
            <>
              <label className="tool-field" style={{ marginTop: "8px" }}>
                <span>NATO 音标字母</span>
                <textarea value={natoOutput} readOnly spellCheck={false} />
              </label>
              <button type="button" onClick={() => void handleCopy(natoOutput, "nato")}>
                {copied === "nato" ? "已复制" : "复制"}
              </button>
            </>
          ) : null}
        </div>

        <div>
          <label className="tool-field">
            <span>NATO 音标字母</span>
            <textarea
              value={natoInput}
              onChange={(e) => { setNatoInput(e.target.value); setCopied(""); }}
              placeholder="如 Alpha Bravo Charlie..."
              spellCheck={false}
            />
          </label>
          <button type="button" className="button--primary" onClick={handleNatoToText} style={{ marginTop: "8px" }}>
            NATO → 文本
          </button>
          {textOutput ? (
            <>
              <label className="tool-field" style={{ marginTop: "8px" }}>
                <span>文本</span>
                <input type="text" value={textOutput} readOnly />
              </label>
              <button type="button" onClick={() => void handleCopy(textOutput, "text")}>
                {copied === "text" ? "已复制" : "复制"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Reference chart */}
      <label className="tool-field">
        <span>NATO 音标字母速查表</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "2px", padding: "8px 0", fontSize: "0.85em" }}>
          {Object.entries(NATO_ALPHABET).map(([letter, word]) => (
            <div key={letter} style={{ padding: "2px 8px" }}>
              <strong>{letter.toUpperCase()}</strong> — {word}
            </div>
          ))}
          {Object.entries(NATO_NUMBERS).map(([num, word]) => (
            <div key={num} style={{ padding: "2px 8px" }}>
              <strong>{num}</strong> — {word}
            </div>
          ))}
        </div>
      </label>

      <p className="tool-note">
        NATO 音标字母（又称 ICAO 音标字母）广泛用于航空、军事和电话通信中，确保每个字母被清晰识别。
      </p>
    </section>
  );
}
