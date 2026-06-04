"use client";

import { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "ut", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "ut", "aliquip", "ex", "ea",
  "commodo", "consequat", "duis", "aute", "irure", "dolor", "in", "reprehenderit",
  "in", "voluptate", "velit", "esse", "cillum", "dolore", "eu", "fugiat", "nulla",
  "pariatur", "excepteur", "sint", "occaecat", "cupidatat", "non", "proident",
  "sunt", "in", "culpa", "qui", "officia", "deserunt", "mollit", "anim", "id",
  "est", "laborum"
];

const CHINESE_CHARACTERS = [
  "在", "的", "地", "得", "和", "是", "一", "国", "会", "国", "大", "家", "为",
  "人", "民", "产", "业", "经", "济", "发", "展", "社", "会", "进", "步", "科",
  "技", "创", "新", "文", "化", "传", "承", "美", "好", "生", "活", "健", "康",
  "快", "乐", "平", "安", "幸", "福", "力", "量", "智", "慧", "勇", "气", "梦",
  "想", "光", "明", "希", "望", "星", "空", "大", "海", "山", "川", "湖", "泊",
  "微", "风", "细", "雨", "阳", "光", "花", "草", "树", "木", "飞", "鸟", "游",
  "鱼", "动", "作", "思", "考", "学", "习", "工", "作", "创", "造", "建", "设",
  "友", "谊", "团", "结", "合", "作", "开", "放", "包", "容", "和", "谐", "共",
  "赢", "自", "然", "生", "态", "环", "保", "绿", "色", "低", "碳", "循", "环",
  "发", "明", "探", "索", "研", "究", "开", "发", "设", "计", "制", "造", "品",
  "质", "服", "务", "体", "验", "效", "率", "安", "全", "可", "靠", "智", "能"
];

const CHINESE_PHRASES = [
  "春风得意马蹄疾", "一日看尽长安花", "明月松间照", "清泉石上流", "行到水穷处",
  "坐看云起时", "大漠孤烟直", "长河落日圆", "海内存知己", "天涯若比邻",
  "读书破万卷", "下笔如有神", "会当凌绝顶", "一览众山小", "山重水复疑无路",
  "柳暗花明又一村", "随风潜入夜", "润物细无声", "落红不是无情物", "化作春泥更护花",
  "但愿人长久", "千里共婵娟", "乘风破浪会有时", "直挂云帆济沧海", "两情若是久长时",
  "又岂在朝朝暮暮", "生当作人杰", "死亦为鬼雄", "少壮不努力", "老大徒伤悲"
];

export default function LoremIpsumGeneratorTool({ manifest }: ToolAppProps) {
  const [lang, setLang] = useState<"en" | "zh">("en");
  const [type, setType] = useState<"paragraphs" | "sentences" | "words">("paragraphs");
  const [count, setCount] = useState<number>(3);
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [format, setFormat] = useState<"text" | "html">("text");
  const [startWithLorem, setStartWithLorem] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const lengthRanges = {
    short: { words: [4, 8], sentences: [3, 5] },
    medium: { words: [8, 14], sentences: [5, 8] },
    long: { words: [14, 22], sentences: [8, 12] }
  };

  const generatedText = useMemo(() => {
    const range = lengthRanges[length];
    
    const getRandomInt = (min: number, max: number) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const capitalize = (str: string) => {
      if (!str) return "";
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const makeWord = () => {
      if (lang === "en") {
        return LOREM_WORDS[getRandomInt(0, LOREM_WORDS.length - 1)];
      } else {
        return CHINESE_CHARACTERS[getRandomInt(0, CHINESE_CHARACTERS.length - 1)];
      }
    };

    const makeSentence = (isFirst = false) => {
      if (lang === "en") {
        const wordCount = getRandomInt(range.words[0], range.words[1]);
        const sentenceWords: string[] = [];
        
        if (isFirst && startWithLorem && type !== "words") {
          sentenceWords.push("lorem", "ipsum", "dolor", "sit", "amet");
        }
        
        while (sentenceWords.length < wordCount) {
          sentenceWords.push(makeWord());
        }
        
        // Add random commas
        if (sentenceWords.length > 6) {
          const commaIdx = getRandomInt(2, sentenceWords.length - 3);
          sentenceWords[commaIdx] = sentenceWords[commaIdx] + ",";
        }
        
        return capitalize(sentenceWords.join(" ")) + ".";
      } else {
        // Chinese sentence
        const phraseCount = getRandomInt(2, 4);
        const sentencePhrases: string[] = [];
        while (sentencePhrases.length < phraseCount) {
          sentencePhrases.push(CHINESE_PHRASES[getRandomInt(0, CHINESE_PHRASES.length - 1)]);
        }
        return sentencePhrases.join("，") + "。";
      }
    };

    const makeParagraph = (isFirst = false) => {
      const sentenceCount = getRandomInt(range.sentences[0], range.sentences[1]);
      const sentences: string[] = [];
      for (let i = 0; i < sentenceCount; i++) {
        sentences.push(makeSentence(isFirst && i === 0));
      }
      return sentences.join(lang === "en" ? " " : "");
    };

    if (type === "words") {
      const wordList: string[] = [];
      if (lang === "en" && startWithLorem) {
        wordList.push("lorem", "ipsum", "dolor", "sit", "amet");
      }
      while (wordList.length < count) {
        wordList.push(makeWord());
      }
      const slice = wordList.slice(0, count);
      return lang === "en" ? capitalize(slice.join(" ")) : slice.join("");
    }

    if (type === "sentences") {
      const sentenceList: string[] = [];
      for (let i = 0; i < count; i++) {
        sentenceList.push(makeSentence(i === 0));
      }
      return sentenceList.join(lang === "en" ? " " : "");
    }

    // Paragraphs
    const paragraphList: string[] = [];
    for (let i = 0; i < count; i++) {
      paragraphList.push(makeParagraph(i === 0));
    }

    if (format === "html") {
      return paragraphList.map(p => `<p>${p}</p>`).join("\n\n");
    }
    return paragraphList.join("\n\n");
  }, [lang, type, count, length, format, startWithLorem]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // ignore
    }
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">文本工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="tool-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <label className="tool-field tool-field--compact">
          <span>语言类型</span>
          <select value={lang} onChange={(e) => setLang(e.target.value as "en" | "zh")}>
            <option value="en">English (Lorem Ipsum)</option>
            <option value="zh">中文 (乱数假文/诗句)</option>
          </select>
        </label>

        <label className="tool-field tool-field--compact">
          <span>生成单位</span>
          <select value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="paragraphs">段落 (Paragraphs)</option>
            <option value="sentences">句子 (Sentences)</option>
            <option value="words">单词/字数 (Words)</option>
          </select>
        </label>

        <label className="tool-field tool-field--compact">
          <span>数量</span>
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
          />
        </label>

        {type !== "words" && (
          <label className="tool-field tool-field--compact">
            <span>段落/句子长度</span>
            <select value={length} onChange={(e) => setLength(e.target.value as any)}>
              <option value="short">短 (Short)</option>
              <option value="medium">中 (Medium)</option>
              <option value="long">长 (Long)</option>
            </select>
          </label>
        )}

        {type === "paragraphs" && (
          <label className="tool-field tool-field--compact">
            <span>输出格式</span>
            <select value={format} onChange={(e) => setFormat(e.target.value as any)}>
              <option value="text">纯文本 (Plain Text)</option>
              <option value="html">HTML (&lt;p&gt; 标签)</option>
            </select>
          </label>
        )}

        {lang === "en" && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={startWithLorem}
              onChange={(e) => setStartWithLorem(e.target.checked)}
            />
            <span style={{ fontSize: "14px", opacity: 0.9 }}>以 "Lorem ipsum" 开头</span>
          </label>
        )}
      </div>

      <div className="workspace" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: "14px", opacity: 0.8 }}>生成的占位文本：</span>
          <button type="button" onClick={copyToClipboard} style={{ padding: "6px 12px", minWidth: 80 }}>
            {copied ? "已复制" : "复制文本"}
          </button>
        </div>
        
        <label className="tool-field" style={{ flex: 1 }}>
          <textarea
            value={generatedText}
            readOnly
            style={{ minHeight: "260px", fontFamily: "monospace", fontSize: "14px", lineHeight: "1.6" }}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </label>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>字符数 (含空格)</h3>
          <p>{generatedText.length} 字</p>
        </article>
        <article className="detail-card">
          <h3>单词/汉字数</h3>
          <p>
            {lang === "en"
              ? generatedText.split(/\s+/).filter(Boolean).length
              : generatedText.replace(/[^\u4e00-\u9fa5]/g, "").length}{" "}
            个
          </p>
        </article>
        <article className="detail-card">
          <h3>输出段落数</h3>
          <p>{type === "paragraphs" ? count : 1} 段</p>
        </article>
      </div>
    </section>
  );
}
