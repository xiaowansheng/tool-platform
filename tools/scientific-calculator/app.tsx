"use client";

import React, { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

// --- Tokenizer and Parser for Scientific Calculator ---

interface Token {
  type: "NUMBER" | "OPERATOR" | "LPAREN" | "RPAREN" | "FUNCTION" | "CONSTANT";
  value: string;
}

function tokenize(str: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < str.length) {
    const char = str[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Mathematical operators
    if (["+", "-", "*", "/", "^", "!"].includes(char)) {
      tokens.push({ type: "OPERATOR", value: char });
      i++;
      continue;
    }

    // Parentheses
    if (char === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }

    // Constants
    if (char === "π") {
      tokens.push({ type: "CONSTANT", value: "π" });
      i++;
      continue;
    }
    if (char === "e" && !/[a-z0-9]/i.test(str[i + 1] || "")) {
      tokens.push({ type: "CONSTANT", value: "e" });
      i++;
      continue;
    }

    // Numbers
    if (/[0-9.]/.test(char)) {
      let numStr = "";
      while (i < str.length && /[0-9.]/.test(str[i])) {
        numStr += str[i];
        i++;
      }
      tokens.push({ type: "NUMBER", value: numStr });
      continue;
    }

    // Functions
    if (/[a-z]/i.test(char)) {
      let word = "";
      while (i < str.length && /[a-z0-9]/i.test(str[i])) {
        word += str[i];
        i++;
      }

      const functions = [
        "sin",
        "cos",
        "tan",
        "asin",
        "acos",
        "atan",
        "ln",
        "log",
        "log2",
        "sqrt",
        "cbrt",
        "abs",
        "exp"
      ];

      if (functions.includes(word)) {
        tokens.push({ type: "FUNCTION", value: word });
      } else if (word === "pi") {
        tokens.push({ type: "CONSTANT", value: "π" });
      } else if (word === "e") {
        tokens.push({ type: "CONSTANT", value: "e" });
      } else {
        throw new Error(`未知标识符: ${word}`);
      }
      continue;
    }

    throw new Error(`未知字符: ${char}`);
  }
  return tokens;
}

class Parser {
  private tokens: Token[];
  private index = 0;
  private isDeg: boolean;

  constructor(tokens: Token[], isDeg = false) {
    this.tokens = tokens;
    this.isDeg = isDeg;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private consume(expectedType?: string): Token {
    const token = this.tokens[this.index];
    if (!token) {
      throw new Error("未预期的输入结束");
    }
    if (expectedType && token.type !== expectedType) {
      throw new Error(`期望得到 ${expectedType}，实际为 ${token.type}`);
    }
    this.index++;
    return token;
  }

  public parse(): number {
    const val = this.parseExpression();
    if (this.index < this.tokens.length) {
      throw new Error("未预期的多余字符");
    }
    return val;
  }

  private parseExpression(): number {
    let val = this.parseTerm();
    while (true) {
      const next = this.peek();
      if (next && next.type === "OPERATOR" && (next.value === "+" || next.value === "-")) {
        this.consume();
        const rhs = this.parseTerm();
        if (next.value === "+") {
          val += rhs;
        } else {
          val -= rhs;
        }
      } else {
        break;
      }
    }
    return val;
  }

  private parseTerm(): number {
    let val = this.parsePower();
    while (true) {
      const next = this.peek();
      if (next && next.type === "OPERATOR" && (next.value === "*" || next.value === "/")) {
        this.consume();
        const rhs = this.parsePower();
        if (next.value === "*") {
          val *= rhs;
        } else {
          if (rhs === 0) {
            throw new Error("除数不能为零");
          }
          val /= rhs;
        }
      } else {
        break;
      }
    }
    return val;
  }

  private parsePower(): number {
    let val = this.parseFactor();
    while (true) {
      const next = this.peek();
      if (next && next.type === "OPERATOR" && next.value === "^") {
        this.consume();
        const rhs = this.parseFactor();
        val = Math.pow(val, rhs);
      } else {
        break;
      }
    }
    return val;
  }

  private parseFactor(): number {
    return this.parseUnary();
  }

  private parseUnary(): number {
    const next = this.peek();
    if (next && next.type === "OPERATOR" && (next.value === "+" || next.value === "-")) {
      this.consume();
      const val = this.parseUnary();
      return next.value === "-" ? -val : val;
    }

    let val = this.parsePrimary();

    const post = this.peek();
    if (post && post.type === "OPERATOR" && post.value === "!") {
      this.consume();
      val = this.factorial(val);
    }

    return val;
  }

  private factorial(n: number): number {
    if (n < 0 || !Number.isInteger(n)) {
      throw new Error("阶乘输入必须为非负整数");
    }
    if (n > 170) {
      return Infinity;
    }
    let res = 1;
    for (let i = 2; i <= n; i++) {
      res *= i;
    }
    return res;
  }

  private parsePrimary(): number {
    const token = this.peek();
    if (!token) {
      throw new Error("未预期的输入结束");
    }

    if (token.type === "NUMBER") {
      this.consume();
      const val = Number(token.value);
      if (Number.isNaN(val)) {
        throw new Error(`无效数字: ${token.value}`);
      }
      return val;
    }

    if (token.type === "CONSTANT") {
      this.consume();
      if (token.value === "π") {
        return Math.PI;
      }
      if (token.value === "e") {
        return Math.E;
      }
    }

    if (token.type === "FUNCTION") {
      this.consume();
      this.consume("LPAREN");
      const arg = this.parseExpression();
      this.consume("RPAREN");

      const fn = token.value;
      switch (fn) {
        case "sin":
          return Math.sin(this.isDeg ? (arg * Math.PI) / 180 : arg);
        case "cos":
          return Math.cos(this.isDeg ? (arg * Math.PI) / 180 : arg);
        case "tan":
          return Math.tan(this.isDeg ? (arg * Math.PI) / 180 : arg);
        case "asin":
          const asinVal = Math.asin(arg);
          return this.isDeg ? (asinVal * 180) / Math.PI : asinVal;
        case "acos":
          const acosVal = Math.acos(arg);
          return this.isDeg ? (acosVal * 180) / Math.PI : acosVal;
        case "atan":
          const atanVal = Math.atan(arg);
          return this.isDeg ? (atanVal * 180) / Math.PI : atanVal;
        case "ln":
          if (arg <= 0) throw new Error("对数输入必须大于零");
          return Math.log(arg);
        case "log":
          if (arg <= 0) throw new Error("对数输入必须大于零");
          return Math.log10(arg);
        case "log2":
          if (arg <= 0) throw new Error("对数输入必须大于零");
          return Math.log2(arg);
        case "sqrt":
          if (arg < 0) throw new Error("平方根输入必须非负");
          return Math.sqrt(arg);
        case "cbrt":
          return Math.cbrt(arg);
        case "abs":
          return Math.abs(arg);
        case "exp":
          return Math.exp(arg);
        default:
          throw new Error(`未实现函数: ${fn}`);
      }
    }

    if (token.type === "LPAREN") {
      this.consume();
      const val = this.parseExpression();
      this.consume("RPAREN");
      return val;
    }

    throw new Error(`未预期的标记: ${token.value}`);
  }
}

function safeEvaluate(expr: string, isDeg: boolean): { success: boolean; value?: number; error?: string } {
  if (!expr.trim()) {
    return { success: true, value: 0 };
  }
  try {
    const tokens = tokenize(expr);
    const parser = new Parser(tokens, isDeg);
    const val = parser.parse();
    return { success: true, value: val };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "计算错误" };
  }
}

function formatResult(value: number): string {
  if (!Number.isFinite(value)) {
    return value.toString();
  }
  // If result is very small or very large, use exponential notation
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 1e-6 || abs > 1e12)) {
    return value.toExponential(8);
  }
  // General format
  return Number(value.toFixed(10)).toString(); // Removes trailing zeros safely
}

function deleteLastChar(expr: string): string {
  const functionsWithParen = [
    "asin(",
    "acos(",
    "atan(",
    "log2(",
    "sqrt(",
    "cbrt(",
    "sin(",
    "cos(",
    "tan(",
    "abs(",
    "exp(",
    "log(",
    "ln("
  ];
  for (const fn of functionsWithParen) {
    if (expr.endsWith(fn)) {
      return expr.slice(0, -fn.length);
    }
  }
  return expr.slice(0, -1);
}

interface HistoryItem {
  id: string;
  formula: string;
  result: string;
}

export default function ScientificCalculatorTool({ manifest }: ToolAppProps) {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [isDeg, setIsDeg] = useState(false);
  const [memory, setMemory] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  // Focus container for keyboard support
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  // Compute live preview of the expression
  useEffect(() => {
    if (!expression.trim()) {
      setPreviewResult(null);
      setErrorMsg("");
      return;
    }

    // Try evaluating
    const res = safeEvaluate(expression, isDeg);
    if (res.success && res.value !== undefined) {
      setPreviewResult(formatResult(res.value));
      setErrorMsg("");
    } else {
      setPreviewResult(null);
      setErrorMsg(res.error || "");
    }
  }, [expression, isDeg]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input element elsewhere
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      const key = e.key;

      if (/[0-9.]/.test(key)) {
        e.preventDefault();
        inputKey(key);
      } else if (["+", "-", "*", "/", "^", "!", "(", ")"].includes(key)) {
        e.preventDefault();
        inputKey(key);
      } else if (key === "Enter" || key === "=") {
        e.preventDefault();
        calculate();
      } else if (key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (key === "Escape" || key.toLowerCase() === "c") {
        e.preventDefault();
        clearAll();
      } else if (key === "p" || key === "P") {
        // shortcut for PI
        e.preventDefault();
        inputKey("π");
      } else if (key === "e" || key === "E") {
        // shortcut for e constant
        e.preventDefault();
        inputKey("e");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [expression, isDeg, hasCalculated]);

  const inputKey = (key: string) => {
    if (hasCalculated) {
      // If we just completed a calculation:
      // If the user inputs an operator, append to previous result.
      // Otherwise, start a fresh expression.
      if (["+", "-", "*", "/", "^", "!"].includes(key)) {
        setExpression(result + key);
      } else {
        setExpression(key);
      }
      setHasCalculated(false);
    } else {
      setExpression((prev) => prev + key);
    }
  };

  const clearAll = () => {
    setExpression("");
    setResult("0");
    setPreviewResult(null);
    setErrorMsg("");
    setHasCalculated(false);
  };

  const backspace = () => {
    setExpression((prev) => deleteLastChar(prev));
    setHasCalculated(false);
  };

  const calculate = () => {
    if (!expression.trim()) return;

    const res = safeEvaluate(expression, isDeg);
    if (res.success && res.value !== undefined) {
      const formatted = formatResult(res.value);
      setResult(formatted);
      setPreviewResult(null);
      setErrorMsg("");

      // Add to history
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        formula: expression,
        result: formatted
      };
      setHistory((prev) => [newItem, ...prev].slice(0, 30)); // limit to 30 items
      setHasCalculated(true);
    } else {
      setErrorMsg(res.error || "无效表达式");
    }
  };

  // Memory Functions
  const handleMC = () => {
    setMemory(0);
  };

  const handleMR = () => {
    if (hasCalculated) {
      setExpression(formatResult(memory));
      setHasCalculated(false);
    } else {
      setExpression((prev) => prev + formatResult(memory));
    }
  };

  const handleMPlus = () => {
    const res = safeEvaluate(expression || result, isDeg);
    if (res.success && res.value !== undefined) {
      setMemory((m) => m + res.value!);
    }
  };

  const handleMMinus = () => {
    const res = safeEvaluate(expression || result, isDeg);
    if (res.success && res.value !== undefined) {
      setMemory((m) => m - res.value!);
    }
  };

  const handleMS = () => {
    const res = safeEvaluate(expression || result, isDeg);
    if (res.success && res.value !== undefined) {
      setMemory(res.value);
    }
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setExpression(item.formula);
    setResult(item.result);
    setHasCalculated(true);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <section className="tool-panel">
      {/* Custom premium stylesheet for Scientific Calculator */}
      <style>{`
        .calc-wrapper {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          margin-top: 1rem;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        @media (min-width: 1024px) {
          .calc-wrapper {
            grid-template-columns: 3fr 1fr;
          }
        }
        
        /* Premium Glass Screen */
        .calc-screen {
          background: linear-gradient(135deg, #090d16 0%, #030712 100%);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 140px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6), 0 4px 20px rgba(0, 0, 0, 0.4);
        }
        
        .calc-screen::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.3), transparent);
        }
        
        .screen-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 0.5rem;
        }
        
        .screen-indicators {
          display: flex;
          gap: 0.5rem;
        }
        
        .indicator-badge {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        
        .indicator-badge.active {
          color: #38bdf8;
          border-color: rgba(56, 189, 248, 0.3);
          box-shadow: 0 0 8px rgba(56, 189, 248, 0.15);
        }
        
        .indicator-badge.memory-active {
          color: #34d399;
          border-color: rgba(52, 211, 153, 0.3);
        }
        
        .screen-formula {
          font-size: 1.15rem;
          color: #94a3b8;
          min-height: 1.75rem;
          word-break: break-all;
          text-align: right;
          letter-spacing: 0.05em;
          overflow-y: auto;
          max-height: 60px;
        }
        
        .screen-result-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          margin-top: auto;
        }
        
        .screen-result {
          font-size: 2.25rem;
          font-weight: 700;
          color: #f8fafc;
          word-break: break-all;
          text-align: right;
          line-height: 1.2;
          letter-spacing: 0.02em;
          text-shadow: 0 0 1px rgba(255,255,255,0.2);
        }
        
        .screen-preview {
          font-size: 1rem;
          color: #475569;
          font-style: italic;
          margin-top: 0.25rem;
        }

        .screen-error {
          font-size: 0.85rem;
          color: #ef4444;
          font-weight: 500;
          margin-top: 0.25rem;
        }
        
        /* Keypad Container */
        .calc-body {
          background: #0b0f19;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 1.25rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        /* Toolbar (Memory / Angles) */
        .calc-control-bar {
          display: flex;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }
        
        .ctrl-btn {
          flex: 1;
          min-width: 60px;
          background: rgba(30, 41, 59, 0.5);
          color: #94a3b8;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: center;
        }
        
        .ctrl-btn:hover {
          background: rgba(30, 41, 59, 0.8);
          color: #f1f5f9;
          border-color: rgba(255, 255, 255, 0.1);
        }
        
        .ctrl-btn:active {
          transform: scale(0.95);
        }
        
        .ctrl-btn.active-mode {
          background: rgba(14, 165, 233, 0.15);
          border-color: rgba(14, 165, 233, 0.3);
          color: #38bdf8;
        }
        
        /* Dual-Grid Keyboard Layout */
        .keyboard-grids {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
        
        @media (min-width: 768px) {
          .keyboard-grids {
            grid-template-columns: 1.2fr 1fr;
          }
        }
        
        .keys-grid {
          display: grid;
          gap: 0.625rem;
        }
        
        .scientific-grid {
          grid-template-columns: repeat(4, 1fr);
        }
        
        .numeric-grid {
          grid-template-columns: repeat(4, 1fr);
        }
        
        /* Interactive Buttons */
        .calc-key {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          height: 48px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
          outline: none;
          position: relative;
        }
        
        .calc-key::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 12px;
          background: transparent;
          transition: background 0.15s ease;
        }
        
        .calc-key:active {
          transform: translateY(1px);
        }
        
        /* Functional Scientific Keys */
        .key-sci {
          background: rgba(30, 41, 59, 0.35);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.08);
          font-size: 0.85rem;
        }
        
        .key-sci:hover {
          background: rgba(56, 189, 248, 0.1);
          border-color: rgba(56, 189, 248, 0.25);
          color: #7dd3fc;
        }
        
        /* Standard Number Keys */
        .key-num {
          background: #1e293b;
          color: #f1f5f9;
          border: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 1.15rem;
        }
        
        .key-num:hover {
          background: #334155;
          border-color: rgba(255, 255, 255, 0.08);
        }
        
        /* Arithmetic Operator Keys */
        .key-op {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
          font-size: 1.15rem;
        }
        
        .key-op:hover {
          background: rgba(245, 158, 11, 0.2);
          border-color: rgba(245, 158, 11, 0.3);
          color: #fbbf24;
        }
        
        /* Action Keys (Clear, Backspace) */
        .key-action {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
          font-size: 0.9rem;
        }
        
        .key-action:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }
        
        /* Large Equal Key */
        .key-equal {
          background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
          color: #ffffff;
          border: none;
          grid-column: span 1;
          font-size: 1.35rem;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        
        .key-equal:hover {
          background: linear-gradient(135deg, #6366f1 0%, #60a5fa 100%);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }
        
        /* Calculations History Panel */
        .history-panel {
          background: #0b0f19;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          max-height: 480px;
        }
        
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 0.5rem;
        }
        
        .history-header h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #94a3b8;
          margin: 0;
        }
        
        .clear-history-btn {
          font-size: 0.75rem;
          color: #ef4444;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }
        
        .clear-history-btn:hover {
          background: rgba(239, 68, 68, 0.08);
        }
        
        .history-list {
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-right: 0.25rem;
        }
        
        .history-list::-webkit-scrollbar {
          width: 4px;
        }
        
        .history-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        
        .history-item {
          background: rgba(30, 41, 59, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 0.625rem;
          cursor: pointer;
          text-align: right;
          transition: all 0.2s ease;
        }
        
        .history-item:hover {
          background: rgba(30, 41, 59, 0.6);
          border-color: rgba(56, 189, 248, 0.2);
          transform: translateX(-2px);
        }
        
        .history-formula {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 0.25rem;
          word-break: break-all;
        }
        
        .history-result {
          font-size: 0.95rem;
          font-weight: 600;
          color: #f1f5f9;
          word-break: break-all;
        }
        
        .history-empty {
          color: #475569;
          font-size: 0.75rem;
          text-align: center;
          margin-top: 2rem;
          font-style: italic;
        }
        
        .helper-text {
          font-size: 0.75rem;
          color: #475569;
          margin-top: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">计算工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="calc-wrapper" ref={containerRef} tabIndex={0} style={{ outline: "none" }}>
        {/* Main Calculator */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Output Display Screen */}
          <div className="calc-screen">
            <div className="screen-top">
              <div className="screen-indicators">
                <span className={`indicator-badge ${isDeg ? "active" : ""}`}>deg</span>
                <span className={`indicator-badge ${!isDeg ? "active" : ""}`}>rad</span>
                {memory !== 0 && <span className="indicator-badge memory-active">M ({formatResult(memory)})</span>}
              </div>
              <span style={{ opacity: 0.5, fontSize: "0.7rem" }}>科学模式</span>
            </div>

            {/* Formula Text */}
            <div className="screen-formula">
              {expression || <span style={{ opacity: 0.15 }}>输入算式</span>}
            </div>

            {/* Main result & Preview */}
            <div className="screen-result-wrapper">
              <div className="screen-result">{result}</div>
              {previewResult !== null && previewResult !== result && (
                <div className="screen-preview">= {previewResult}</div>
              )}
              {errorMsg && <div className="screen-error">{errorMsg}</div>}
            </div>
          </div>

          {/* Interactive Calculator Body */}
          <div className="calc-body">
            {/* Top Toolbar (Memory + Unit control) */}
            <div className="calc-control-bar">
              <button
                type="button"
                className={`ctrl-btn ${isDeg ? "active-mode" : ""}`}
                onClick={() => setIsDeg(true)}
                title="切换为角度模式"
              >
                DEG
              </button>
              <button
                type="button"
                className={`ctrl-btn ${!isDeg ? "active-mode" : ""}`}
                onClick={() => setIsDeg(false)}
                title="切换为弧度模式"
              >
                RAD
              </button>

              <button type="button" className="ctrl-btn" onClick={handleMC} title="清除内存 (Memory Clear)">
                MC
              </button>
              <button type="button" className="ctrl-btn" onClick={handleMR} title="读取内存 (Memory Recall)">
                MR
              </button>
              <button type="button" className="ctrl-btn" onClick={handleMPlus} title="内存相加 (Memory Plus)">
                M+
              </button>
              <button type="button" className="ctrl-btn" onClick={handleMMinus} title="内存相减 (Memory Minus)">
                M-
              </button>
              <button type="button" className="ctrl-btn" onClick={handleMS} title="内存存储 (Memory Store)">
                MS
              </button>
            </div>

            {/* Scientific and Numeric Keyboards */}
            <div className="keyboard-grids">
              {/* Left Column: Scientific Operators */}
              <div className="keys-grid scientific-grid">
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("sin(")} title="正弦">
                  sin
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("cos(")} title="余弦">
                  cos
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("tan(")} title="正切">
                  tan
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("(")} title="左括号">
                  (
                </button>

                <button type="button" className="calc-key key-sci" onClick={() => inputKey("asin(")} title="反正弦">
                  asin
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("acos(")} title="反余弦">
                  acos
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("atan(")} title="反正切">
                  atan
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey(")")} title="右括号">
                  )
                </button>

                <button type="button" className="calc-key key-sci" onClick={() => inputKey("ln(")} title="自然对数 (e底)">
                  ln
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("log(")} title="常用对数 (10底)">
                  log
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("log2(")} title="对数 (2底)">
                  log₂
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("^2")} title="平方">
                  x²
                </button>

                <button type="button" className="calc-key key-sci" onClick={() => inputKey("sqrt(")} title="平方根">
                  √
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("cbrt(")} title="立方根">
                  ³√
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("^")} title="幂运算">
                  x^y
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("^3")} title="立方">
                  x³
                </button>

                <button type="button" className="calc-key key-sci" onClick={() => inputKey("π")} title="圆周率">
                  π
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("e")} title="自然常数">
                  e
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("!")} title="阶乘">
                  x!
                </button>
                <button type="button" className="calc-key key-sci" onClick={() => inputKey("abs(")} title="绝对值">
                  abs
                </button>

                <button
                  type="button"
                  className="calc-key key-sci"
                  onClick={() => inputKey("exp(")}
                  title="指数函数 e^x"
                  style={{ gridColumn: "span 2" }}
                >
                  exp
                </button>
                <button
                  type="button"
                  className="calc-key key-sci"
                  onClick={() => inputKey("/100")}
                  title="百分之"
                  style={{ gridColumn: "span 2" }}
                >
                  %
                </button>
              </div>

              {/* Right Column: Numbers and Basic Operators */}
              <div className="keys-grid numeric-grid">
                <button type="button" className="calc-key key-action" onClick={clearAll} title="全部清除">
                  AC
                </button>
                <button type="button" className="calc-key key-action" onClick={backspace} title="退格">
                  Del
                </button>
                <button type="button" className="calc-key key-op" onClick={() => inputKey("/")} title="除">
                  ÷
                </button>
                <button type="button" className="calc-key key-op" onClick={() => inputKey("*")} title="乘">
                  ×
                </button>

                <button type="button" className="calc-key key-num" onClick={() => inputKey("7")}>
                  7
                </button>
                <button type="button" className="calc-key key-num" onClick={() => inputKey("8")}>
                  8
                </button>
                <button type="button" className="calc-key key-num" onClick={() => inputKey("9")}>
                  9
                </button>
                <button type="button" className="calc-key key-op" onClick={() => inputKey("-")} title="减">
                  -
                </button>

                <button type="button" className="calc-key key-num" onClick={() => inputKey("4")}>
                  4
                </button>
                <button type="button" className="calc-key key-num" onClick={() => inputKey("5")}>
                  5
                </button>
                <button type="button" className="calc-key key-num" onClick={() => inputKey("6")}>
                  6
                </button>
                <button type="button" className="calc-key key-op" onClick={() => inputKey("+")} title="加">
                  +
                </button>

                <button type="button" className="calc-key key-num" onClick={() => inputKey("1")}>
                  1
                </button>
                <button type="button" className="calc-key key-num" onClick={() => inputKey("2")}>
                  2
                </button>
                <button type="button" className="calc-key key-num" onClick={() => inputKey("3")}>
                  3
                </button>
                <button
                  type="button"
                  className="calc-key key-equal"
                  onClick={calculate}
                  title="计算结果"
                  style={{ gridRow: "span 2", height: "auto" }}
                >
                  =
                </button>

                <button
                  type="button"
                  className="calc-key key-num"
                  onClick={() => inputKey("0")}
                  style={{ gridColumn: "span 2" }}
                >
                  0
                </button>
                <button type="button" className="calc-key key-num" onClick={() => inputKey(".")}>
                  .
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Calculation History */}
        <div className="history-panel">
          <div className="history-header">
            <h3>计算历史</h3>
            {history.length > 0 && (
              <button type="button" className="clear-history-btn" onClick={clearHistory}>
                清空
              </button>
            )}
          </div>
          <div className="history-list">
            {history.length > 0 ? (
              history.map((item) => (
                <div key={item.id} className="history-item" onClick={() => handleHistoryClick(item)}>
                  <div className="history-formula">{item.formula}</div>
                  <div className="history-result">{item.result}</div>
                </div>
              ))
            ) : (
              <div className="history-empty">暂无历史记录</div>
            )}
          </div>
        </div>
      </div>

      <div className="helper-text">
        <span>* 提示：支持物理键盘输入数字、运算符及括号，回车键触发计算。</span>
        <span>版本 1.0.0</span>
      </div>
    </section>
  );
}
