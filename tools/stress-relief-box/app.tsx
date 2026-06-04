"use client";

import { useState, useEffect, useRef } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

// Floating emoji / text item
interface FloatingParticle {
  id: number;
  text: string;
  x: number;
  y: number;
  angle?: number;
  color?: string;
}

// Boss corporate quotes presets
const BOSS_PIE_QUOTES = [
  "我们今年要打通底层逻辑，寻找业务护城河，拥抱变化，实现闭环！",
  "大家加把劲，明年公司上市了，每个人手里都有期权，财务自由指日可待！",
  "不要只做螺丝钉，要把格局打开，赋能产品，形成业务的矩阵式爆发！",
  "我们虽然今天苦，但我们要吃苦耐劳，和公司一块儿同舟共济，做时间的朋友。",
  "今天这个PPT的痛点没有抓准，要击穿用户心智，重组颗粒度，形成方法论！",
  "年轻人不要老盯着薪水，要看重平台给你带来的核心资产和认知升维！",
  "我们要在红海中开辟蓝海，拉通对齐，抓手要硬，打出一套组合拳！"
];

const BOSS_WECHAT_QUOTES = [
  "在吗？帮我改个PPT，今晚加个班，明天一早晨会要用，辛苦！",
  "刚才客户反馈说按钮颜色不对，你现在重新打包发布一下，在线等。",
  "周会报告怎么还没发？大家态度要积极，工作一定要事事有回音，件件有落脚。",
  "这个设计太保守了，给我做一版高端、大气、有未来感的设计，10分钟后对一下。",
  "大家周末有空来公司开个碰头会，拉通一下下半年的闭环抓手。"
];

// Sarcastic passive-aggressive praises
const SARCASTIC_CLAPS = [
  "写得真棒！你这代码的逻辑深邃得连编译器都看傻了。",
  "太优秀了！能把一个简单的 if-else 写出高深算法的奥妙，令人叹为观止。",
  "真厉害！这功能在开发环境完美运行，只要一到线上就变成了薛定谔的猫。",
  "你修Bug的速度极其惊人，顺便还贴心地送了五个新Bug上线。",
  "不愧是行业精英，完美地把原本只需3分钟完成的工作做成了3天的工作量！",
  "这代码真有艺术感，每个变量名都是秘密，Git 提交记录里全都是忏悔。",
  "写的代码如此随性，完全没有被任何规范所拘束，放飞自我！",
  "看你加班到深夜，摸鱼摸得如此认真，真让人感动！"
];

// Regret options
const REGRET_OPTIONS = [
  { id: "stay-up", text: "昨晚不该熬夜刷手机" },
  { id: "buy-stock", text: "昨天不该盲目跟风买这只股票" },
  { id: "say-wrong", text: "刚才在会议上不该说那句蠢话" },
  { id: "delete-code", text: "不该顺手把未保存的代码强行删掉" },
  { id: "eat-much", text: "刚才不该吃那么多烧烤炸鸡" },
  { id: "reply-msg", text: "不该秒回老板在深夜2点发的微信" }
];

// Lazy Audio Context creator helper
let audioCtx: AudioContext | null = null;
const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
};

// Procedural Synthesizers for funny stress relief toys
const playShredderSound = (ctx: AudioContext) => {
  // High-frequency crinkling paper noise
  const bufferSize = ctx.sampleRate * 0.8; // 0.8 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    // White noise modulated with LFO crunch
    const lfo = Math.sin(2 * Math.PI * 45 * (i / ctx.sampleRate));
    data[i] = (Math.random() * 2 - 1) * (0.3 + 0.7 * Math.abs(lfo));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1600, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.8);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
};

const playDeskSlam = (ctx: AudioContext) => {
  // Low frequency thud + brief noise smack
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.22);

  gain.gain.setValueAtTime(0.8, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.22);

  // Crash noise smack
  const bufferSize = ctx.sampleRate * 0.08;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const bufferData = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    bufferData[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, ctx.currentTime);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.4, ctx.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  osc.start();
  noise.start();
  osc.stop(ctx.currentTime + 0.25);
};

const playWechatAlert = (ctx: AudioContext) => {
  // Classic message ding chime (two pure sine notes)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
  osc1.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.07); // C6

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

  osc1.connect(gain);
  gain.connect(ctx.destination);

  osc1.start();
  osc1.stop(ctx.currentTime + 0.4);
};

const playBuzzFail = (ctx: AudioContext) => {
  // Low frequency warning buzzer
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(130, ctx.currentTime);
  osc2.type = "sawtooth";
  osc2.frequency.setValueAtTime(132, ctx.currentTime); // detuned

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 0.4);
  osc2.stop(ctx.currentTime + 0.4);
};

const playMegaphoneScream = (ctx: AudioContext) => {
  // Funny echoing pitch sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const delay = ctx.createDelay();
  const feedback = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(320, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.15);
  osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.4);

  // Bandpass filter for low-fi megaphone quality
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(900, ctx.currentTime);

  gain.gain.setValueAtTime(0.28, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

  // Echo delay loop
  delay.delayTime.setValueAtTime(0.12, ctx.currentTime);
  feedback.gain.setValueAtTime(0.35, ctx.currentTime);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  // echo routing
  gain.connect(delay);
  delay.connect(feedback);
  feedback.connect(ctx.destination);
  feedback.connect(delay); // loop feedback

  osc.start();
  osc.stop(ctx.currentTime + 0.5);
};

const playTimeWarpChime = (ctx: AudioContext) => {
  // Upward sparkling arpeggio notes
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.5]; // C4, E4, G4, C5, E5, G5, C6
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
  gain.connect(ctx.destination);

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, ctx.currentTime + idx * 0.08);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.4);

    osc.connect(oscGain);
    oscGain.connect(gain);
    
    osc.start();
    osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
  });
};

const playMetallicCoinChime = (ctx: AudioContext) => {
  // Coin resonance sweep
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.32, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
  gain.connect(ctx.destination);

  const freqs = [3300, 3900, 4400];
  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  });
};

const playRebelHit = (ctx: AudioContext) => {
  // Keyboard smash / hit sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(350, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.15);
};

const playToySqueaker = (ctx: AudioContext) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(950, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(1900, ctx.currentTime + 0.05);
  osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.11);
  gain.gain.setValueAtTime(0.22, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.13);
};

const playTempleBell = (ctx: AudioContext, vol = 0.35) => {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 5.5);
  gain.connect(ctx.destination);
  const frequencies = [156, 312, 478, 620, 784];
  frequencies.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    osc.type = index === 0 ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    const oscGain = ctx.createGain();
    const oscVol = index === 0 ? 0.8 : 0.4 / index;
    oscGain.gain.setValueAtTime(oscVol, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (5.5 - index * 0.7));
    osc.connect(oscGain);
    oscGain.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + 5.5);
  });
};

const playWindChimeNote = (ctx: AudioContext) => {
  const scale = [329.63, 392.00, 440.00, 493.88, 587.33, 659.25];
  const freq = scale[Math.floor(Math.random() * scale.length)];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.5);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 3.5);
};

export default function StressReliefBoxTool({ manifest }: ToolAppProps) {
  // --- Tab Menu State ---
  const [activeTab, setActiveTab] = useState<"shredder" | "boss" | "clapper" | "megaphone" | "regret" | "karma">("shredder");

  // --- Shared Merit / Vent stats ---
  const [cyberMerit, setCyberMerit] = useState<number>(0);
  const [shredCount, setShredCount] = useState<number>(0);
  const [rebelCount, setRebelCount] = useState<number>(0);

  // Floating animations
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const particleIdRef = useRef<number>(0);

  // --- TAB 1: Worry Shredder States ---
  const [worryInput, setWorryInput] = useState<string>("");
  const [shredderActive, setShredderActive] = useState<boolean>(false);
  const [shreddedLines, setShreddedLines] = useState<string[]>([]);
  const [shredderVisibleText, setShredderVisibleText] = useState<string>("");

  // --- TAB 2: Boss Simulator States ---
  const [bossMessage, setBossMessage] = useState<string>("（双击动作按钮向我发起画大饼或催命微信吧）");
  const [bossActiveAction, setBossActiveAction] = useState<"none" | "shake" | "dizzy" | "slam">("none");

  // --- TAB 3: Sarcastic Clapper States ---
  const [sarcasticQuote, setSarcasticQuote] = useState<string>("狂点下方的「献上赛博点赞」按钮，收获高级职场赞美。");

  // --- TAB 4: Useless Megaphone States ---
  const [screamInput, setScreamInput] = useState<string>("");
  const [isScreaming, setIsScreaming] = useState<boolean>(false);
  const [screamLetters, setScreamLetters] = useState<{ id: number; char: string; angle: number }[]>([]);

  // --- TAB 5: Regret Pill States ---
  const [selectedRegret, setSelectedRegret] = useState<string>("stay-up");
  const [isWarping, setIsWarping] = useState<boolean>(false);
  const [warpStatus, setWarpStatus] = useState<string>("");

  // --- TAB 6: Cyber Merit Box States ---
  const [isCoinDragging, setIsCoinDragging] = useState<boolean>(false);
  const [isCoinInSlot, setIsCoinInSlot] = useState<boolean>(false);

  // --- Ambient sounds state ---
  const [ambientSounds, setAmbientSounds] = useState<"none" | "bell" | "wind">("none");
  const ambientTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Ambient sound schedule loop ---
  useEffect(() => {
    if (ambientSounds !== "none") {
      const ctx = getAudioContext();
      if (!ctx) return;
      const triggerAmbient = () => {
        if (ambientSounds === "bell") {
          playTempleBell(ctx, 0.25);
        } else if (ambientSounds === "wind") {
          playWindChimeNote(ctx);
          setTimeout(() => playWindChimeNote(ctx), 1500 + Math.random() * 1500);
        }
        const nextDelay = 18000 + Math.random() * 15000;
        ambientTimerRef.current = setTimeout(triggerAmbient, nextDelay);
      };
      triggerAmbient();
    } else {
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
    }
    return () => {
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
    };
  }, [ambientSounds]);

  // --- Helper Spawn Floating Particle ---
  const spawnParticle = (text: string, x: number, y: number, color?: string) => {
    const id = particleIdRef.current++;
    const angle = (Math.random() - 0.5) * 40; // flight slant
    const newPart: FloatingParticle = { id, text, x, y, angle, color };
    setParticles((prev) => [...prev, newPart]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, 1200);
  };

  // --- TAB 1: Shredder Animation ---
  const handleShred = () => {
    if (!worryInput.trim() || shredderActive) return;

    const ctx = getAudioContext();
    if (ctx) playShredderSound(ctx);

    setShredderActive(true);
    setShredderVisibleText(worryInput);
    
    // Split text into vertical columns representing shredded strips
    const strips = Array.from({ length: 12 }, (_, idx) => {
      const sliceStart = Math.floor((worryInput.length / 12) * idx);
      const sliceEnd = Math.floor((worryInput.length / 12) * (idx + 1));
      return worryInput.slice(sliceStart, sliceEnd) || " ";
    });
    setShreddedLines(strips);
    setWorryInput("");

    // Conclude shredding animation after 2 seconds
    setTimeout(() => {
      setShredderActive(false);
      setShredCount((prev) => prev + 1);
      spawnParticle("烦恼已消散 🍃", 120, 110, "var(--accent-success)");
    }, 2200);
  };

  // --- TAB 2: Boss Action triggers ---
  const handleBossAction = (actionType: "pie" | "wechat" | "slam" | "rebel") => {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (actionType === "pie") {
      playBuzzFail(ctx);
      setBossActiveAction("shake");
      const randomPie = BOSS_PIE_QUOTES[Math.floor(Math.random() * BOSS_PIE_QUOTES.length)];
      setBossMessage(`老板说：“${randomPie}”`);
      setTimeout(() => setBossActiveAction("none"), 600);
    } else if (actionType === "wechat") {
      playWechatAlert(ctx);
      setBossActiveAction("shake");
      const randomMsg = BOSS_WECHAT_QUOTES[Math.floor(Math.random() * BOSS_WECHAT_QUOTES.length)];
      setBossMessage(`[微信催命] 老板：“${randomMsg}”`);
      setTimeout(() => setBossActiveAction("none"), 600);
    } else if (actionType === "slam") {
      playDeskSlam(ctx);
      setBossActiveAction("slam");
      setBossMessage("老板猛地拍了下桌子：“这个痛点你们完全没抓住！重写！”");
      setTimeout(() => setBossActiveAction("none"), 400);
    } else if (actionType === "rebel") {
      playRebelHit(ctx);
      setBossActiveAction("dizzy");
      setBossMessage("💥 [反击成功] 你用键盘击飞了老板的画大饼，收获了片刻宁静！");
      setRebelCount((prev) => prev + 1);
      setCyberMerit((prev) => prev + 50);
      spawnParticle("反击爽快值 +50", 100, 80, "var(--accent-primary)");
      setTimeout(() => setBossActiveAction("none"), 1800);
    }
  };

  // --- TAB 3: Sarcastic Clapper trigger ---
  const handleSarcasticClap = (e: React.MouseEvent<HTMLButtonElement>) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    playToySqueaker(ctx); // high squeak ding

    const randomClap = SARCASTIC_CLAPS[Math.floor(Math.random() * SARCASTIC_CLAPS.length)];
    setSarcasticQuote(randomClap);

    // Spawn floating thumbs up popping outwards
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left || 120;
    const y = e.clientY - rect.top || 15;

    spawnParticle("👍", x, y, "var(--accent-secondary)");
    if (Math.random() > 0.5) spawnParticle("👏 妙啊", x + 15, y - 20, "var(--accent-warning)");
  };

  // --- TAB 4: Void Megaphone trigger ---
  const handleMegaphoneScream = () => {
    if (!screamInput.trim() || isScreaming) return;

    const ctx = getAudioContext();
    if (ctx) playMegaphoneScream(ctx);

    setIsScreaming(true);
    
    // Split characters to disperse them
    const chars = screamInput.split("").map((char, idx) => ({
      id: idx,
      char,
      angle: -30 + (idx / screamInput.length) * 60 + (Math.random() - 0.5) * 15
    }));
    setScreamLetters(chars);
    setScreamInput("");

    // Conclude blackhole suction
    setTimeout(() => {
      setIsScreaming(false);
      setScreamLetters([]);
      spawnParticle("呐喊消逝在深空 🛸", 110, 110, "var(--text-tertiary)");
    }, 2800);
  };

  // --- TAB 5: Regret Pill trigger ---
  const handleSwallowPill = () => {
    if (isWarping) return;

    const ctx = getAudioContext();
    if (ctx) playTimeWarpChime(ctx);

    setIsWarping(true);
    setWarpStatus("🔮 正在开启逆天时空回滚通道...");

    setTimeout(() => {
      setWarpStatus("💊 后悔药正在消化... 时间节点定位中...");
    }, 1200);

    setTimeout(() => {
      setWarpStatus("⏳ 成功将本宇宙回滚 1 小时！该后悔选择已退化成平行时空垃圾并抛弃。");
      setCyberMerit((prev) => prev + 10);
      spawnParticle("时间回滚成功 ⏱️", 100, 100, "var(--accent-primary)");
    }, 2800);

    setTimeout(() => {
      setIsWarping(false);
      setWarpStatus("");
    }, 6000);
  };

  // --- TAB 6: Cyber Merit Box drop coin ---
  const handleDropCoin = () => {
    if (isCoinInSlot) return;

    const ctx = getAudioContext();
    if (ctx) playMetallicCoinChime(ctx);

    setIsCoinInSlot(true);
    setCyberMerit((prev) => prev + 100);

    spawnParticle("功德 +100 🪙", 110, 50, "var(--accent-warning)");
    spawnParticle("福报加持中 ✨", 85, 30, "var(--accent-primary)");

    setTimeout(() => {
      setIsCoinInSlot(false);
    }, 1500);
  };

  return (
    <section className="tool-panel">
      {/* Premium custom animations and panels styling */}
      <style>{`
        .vent-workspace-grid {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: 1.1fr 0.9fr;
          margin-top: 1.25rem;
        }

        @media (max-width: 900px) {
          .vent-workspace-grid {
            grid-template-columns: 1fr;
          }
        }

        .vent-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          position: relative;
        }

        /* Ambient venting stage box */
        .vent-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 350px;
          border-radius: var(--radius-xl);
          background: radial-gradient(circle at center, rgba(16, 28, 44, 0.45) 0%, rgba(5, 10, 18, 0.96) 100%);
          border: 1px solid var(--border-subtle);
          position: relative;
          overflow: hidden;
        }

        /* Flat grid layout tab switcher */
        .vent-tabs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          background: var(--bg-inset);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 6px;
        }

        .vent-tab-btn {
          border-radius: var(--radius-md);
          border: none !important;
          background: transparent !important;
          color: var(--text-secondary);
          font-weight: 500;
          padding: 8px 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          transition: background var(--duration-fast), color var(--duration-fast);
          transform: none !important;
          box-shadow: none !important;
        }

        .vent-tab-btn.is-active {
          background: var(--bg-muted) !important;
          color: var(--accent-primary);
          font-weight: 700;
        }

        .vent-tab-btn-title {
          font-size: 0.8rem;
        }

        .vent-tab-btn-sub {
          font-size: 0.6rem;
          opacity: 0.7;
        }

        /* --- Floating particles flight animation --- */
        .float-particle {
          position: absolute;
          font-size: 1.1rem;
          font-weight: 800;
          pointer-events: none;
          z-index: 25;
          animation: float-rise-skew 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        @keyframes float-rise-skew {
          0% {
            transform: translateY(0) scale(0.8) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-95px) scale(1.15) rotate(var(--spin-angle, 15deg));
            opacity: 0;
          }
        }

        /* --- TAB 1: Worry Shredder animations --- */
        .shredder-input-paper {
          width: 170px;
          background: #fff;
          border: 1px solid #d1d5db;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          color: #111827;
          font-family: sans-serif;
          font-size: 0.8rem;
          padding: 8px;
          text-align: center;
          border-radius: 2px;
          position: absolute;
          bottom: 155px;
          z-index: 5;
          max-height: 80px;
          overflow: hidden;
        }

        .shredder-input-paper.is-shredding {
          animation: shred-sliding-down 2.2s linear forwards;
        }

        @keyframes shred-sliding-down {
          0% { transform: translateY(0); }
          60% { transform: translateY(80px); opacity: 1; }
          95% { transform: translateY(115px); opacity: 0; }
          100% { transform: translateY(120px); opacity: 0; }
        }

        .shredder-mouth-base {
          position: absolute;
          bottom: 100px;
          width: 190px;
          height: 18px;
          background: #111827;
          border: 2.5px solid var(--border-strong);
          border-radius: 3px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          z-index: 10;
        }

        .shredder-cutting-slit {
          width: 95%;
          height: 4px;
          background: #ef4444;
          margin: 4px auto;
          box-shadow: 0 0 8px #ef4444;
          animation: laser-flicker 0.2s infinite ease;
        }

        @keyframes laser-flicker {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .shredder-paper-strip {
          position: absolute;
          width: 8px;
          background: #f3f4f6;
          border: 0.5px solid #d1d5db;
          height: 70px;
          color: #111827;
          font-size: 6px;
          text-align: center;
          font-weight: bold;
          overflow: hidden;
          opacity: 0;
          z-index: 4;
        }

        .shredder-input-paper.is-shredding ~ .shredder-paper-strip {
          animation: strip-fall-out 2.2s linear forwards;
        }

        @keyframes strip-fall-out {
          0%, 35% {
            opacity: 0;
            transform: translateY(0) rotate(0);
          }
          45% {
            opacity: 1;
            transform: translateY(15px) rotate(2deg);
          }
          85% {
            opacity: 1;
            transform: translateY(85px) rotate(var(--fall-spin, -5deg));
          }
          100% {
            opacity: 0;
            transform: translateY(135px) rotate(var(--fall-spin, -15deg));
          }
        }

        /* --- TAB 2: Boss Simulator Head Shakes --- */
        .boss-svg-box {
          width: 140px;
          height: 140px;
          z-index: 5;
          transition: transform 0.2s ease;
        }

        .boss-svg-box.is-shaking {
          animation: boss-head-shake 0.4s ease-in-out infinite;
        }

        .boss-svg-box.is-slammed {
          animation: boss-head-slam 0.3s ease forwards;
        }

        .boss-svg-box.is-dizzy {
          animation: boss-dizzy-loop 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        @keyframes boss-head-shake {
          0%, 100% { transform: rotate(0) translateX(0); }
          25% { transform: rotate(-5deg) translateX(-4px); }
          75% { transform: rotate(5deg) translateX(4px); }
        }

        @keyframes boss-head-slam {
          0% { transform: translateY(0) scaleY(1); }
          40% { transform: translateY(18px) scaleY(0.8); }
          100% { transform: translateY(0) scaleY(1); }
        }

        @keyframes boss-dizzy-loop {
          0% { transform: rotate(0) scale(1); }
          25% { transform: rotate(180deg) scale(0.9) translateY(-10px); }
          70% { transform: rotate(360deg) scale(0.9) translateY(10px); }
          100% { transform: rotate(720deg) scale(1); }
        }

        /* --- TAB 4: Megaphone to Void blackhole --- */
        .void-blackhole-svg {
          width: 110px;
          height: 110px;
          fill: none;
          stroke: #c084fc;
          stroke-width: 2.5;
          animation: void-spin 6s infinite linear;
          z-index: 3;
        }

        @keyframes void-spin {
          to { transform: rotate(-360deg); }
        }

        .scream-letter-unit {
          position: absolute;
          left: 45%;
          top: 38%;
          font-weight: 900;
          font-size: 1.3rem;
          color: var(--accent-primary);
          text-shadow: 0 0 8px var(--accent-primary);
          z-index: 6;
          pointer-events: none;
        }

        .is-screaming .scream-letter-unit {
          animation: scream-fly-to-void 2.6s cubic-bezier(0.1, 0.6, 0.4, 1.0) forwards;
        }

        @keyframes scream-fly-to-void {
          0% {
            transform: translate(-90px, 60px) scale(0.4);
            opacity: 0.2;
          }
          15% {
            opacity: 1;
            transform: translate(-60px, 40px) scale(1.4);
          }
          70% {
            opacity: 0.9;
            transform: translate(15px, -15px) scale(0.7);
          }
          100% {
            transform: translate(65px, -35px) scale(0.001) rotate(220deg);
            opacity: 0;
          }
        }

        /* --- TAB 5: Regret Pill Time Warp Filter --- */
        .time-warp-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(192, 132, 252, 0.08);
          backdrop-filter: hue-rotate(180deg) blur(2px);
          animation: time-warp-spin 2.6s linear forwards;
          z-index: 8;
          pointer-events: none;
        }

        @keyframes time-warp-spin {
          0% { transform: scale(1); opacity: 0; filter: hue-rotate(0deg); }
          30% { opacity: 0.95; filter: hue-rotate(90deg) blur(4px); }
          75% { transform: scale(1.4) rotate(360deg); opacity: 0.95; }
          100% { transform: scale(1) rotate(720deg); opacity: 0; filter: hue-rotate(360deg); }
        }

        /* --- TAB 6: Cyber Merit Donation Box --- */
        .karma-box-svg {
          width: 140px;
          height: 140px;
          fill: url(#karmaBoxWood);
          stroke: #78350f;
          stroke-width: 2.5;
          z-index: 5;
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .karma-box-svg:hover {
          transform: translateY(-2px) scale(1.03);
        }

        .karma-box-svg:active {
          transform: translateY(2px) scale(0.97);
        }

        .karma-coin {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
          border: 2px solid #fef08a;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          position: absolute;
          bottom: 180px;
          left: calc(50% - 16px);
          z-index: 6;
          cursor: pointer;
          transition: transform 0.1s ease;
        }

        .karma-coin.is-dropping {
          animation: coin-drop-slot 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        @keyframes coin-drop-slot {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          30% { transform: translateY(45px) scale(1); opacity: 1; }
          50% { transform: translateY(68px) scale(0.85); opacity: 0.9; }
          70% { transform: translateY(74px) scale(0.2); opacity: 0.3; }
          100% { transform: translateY(85px) scale(0.001); opacity: 0; }
        }

        /* Stat badge layout */
        .temple-stats-panel {
          display: flex;
          justify-content: space-around;
          background: rgba(6, 14, 22, 0.35);
          border: 1px solid var(--border-subtle);
          padding: 8px;
          border-radius: var(--radius-md);
          margin-bottom: 5px;
        }

        .stat-badge-unit {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .stat-badge-unit span:first-child {
          font-size: 0.68rem;
          color: var(--text-secondary);
        }

        .stat-badge-unit span:last-child {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-primary);
        }
      `}</style>

      {/* Shared Header Copy */}
      <div className="tool-panel__header">
        <p className="eyebrow">娱乐工具</p>
        <h2>{manifest.name}</h2>
        <p>{manifest.description}</p>
      </div>

      {/* Cyber Relief Workbench */}
      <div className="vent-workspace-grid">
        {/* ==================================================== */}
        {/* LEFT COLUMN: Main Venting Stage area */}
        {/* ==================================================== */}
        <div className="vent-card" style={{ gap: "1rem" }}>
          
          {/* Top Toy Selector Navigation */}
          <div className="vent-tabs-grid">
            <button
              type="button"
              className={`vent-tab-btn ${activeTab === "shredder" ? "is-active" : ""}`}
              onClick={() => setActiveTab("shredder")}
            >
              <span className="vent-tab-btn-title">烦恼粉碎机</span>
              <span className="vent-tab-btn-sub">撕碎怨念</span>
            </button>
            <button
              type="button"
              className={`vent-tab-btn ${activeTab === "boss" ? "is-active" : ""}`}
              onClick={() => setActiveTab("boss")}
            >
              <span className="vent-tab-btn-title">老板模拟器</span>
              <span className="vent-tab-btn-sub">画饼与反击</span>
            </button>
            <button
              type="button"
              className={`vent-tab-btn ${activeTab === "clapper" ? "is-active" : ""}`}
              onClick={() => setActiveTab("clapper")}
            >
              <span className="vent-tab-btn-title">讽刺点赞器</span>
              <span className="vent-tab-btn-sub">高级职场赞美</span>
            </button>
            <button
              type="button"
              className={`vent-tab-btn ${activeTab === "megaphone" ? "is-active" : ""}`}
              onClick={() => setActiveTab("megaphone")}
            >
              <span className="vent-tab-btn-title">无效呐喊筒</span>
              <span className="vent-tab-btn-sub">对虚空呼唤</span>
            </button>
            <button
              type="button"
              className={`vent-tab-btn ${activeTab === "regret" ? "is-active" : ""}`}
              onClick={() => setActiveTab("regret")}
            >
              <span className="vent-tab-btn-title">后悔药模拟器</span>
              <span className="vent-tab-btn-sub">时空回退</span>
            </button>
            <button
              type="button"
              className={`vent-tab-btn ${activeTab === "karma" ? "is-active" : ""}`}
              onClick={() => setActiveTab("karma")}
            >
              <span className="vent-tab-btn-title">赛博功德箱</span>
              <span className="vent-tab-btn-sub">投币积德</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="temple-stats-panel">
            <div className="stat-badge-unit">
              <span>当前功德 (Merit)</span>
              <span style={{ color: "var(--accent-warning)" }}>{cyberMerit}</span>
            </div>
            <div className="stat-badge-unit">
              <span>碎纸次数</span>
              <span>{shredCount}</span>
            </div>
            <div className="stat-badge-unit">
              <span>职场反抗</span>
              <span style={{ color: "var(--accent-primary)" }}>{rebelCount}</span>
            </div>
          </div>

          {/* Core Interactive Sandbox */}
          <div className="vent-stage">
            {/* Spawning floating emoji text units */}
            {particles.map((part) => (
              <span
                key={part.id}
                className="float-particle"
                style={{
                  left: part.x,
                  top: part.y,
                  color: part.color || "var(--accent-primary)",
                  textShadow: part.color ? `0 2px 8px ${part.color}` : "0 2px 8px rgba(94, 234, 212, 0.5)",
                  "--spin-angle": `${part.angle}deg`
                } as any}
              >
                {part.text}
              </span>
            ))}

            {/* TAB VIEW 1: Worry Shredder */}
            {activeTab === "shredder" && (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                {/* Paper sheet slip animation */}
                {shredderVisibleText && (
                  <div className={`shredder-input-paper ${shredderActive ? "is-shredding" : ""}`}>
                    <p style={{ margin: "2px 0", fontWeight: "bold", borderBottom: "1px solid #ddd", fontSize: "0.65rem", paddingBottom: "2px" }}>
                      📝 烦恼清单
                    </p>
                    <p style={{ margin: "4px 0 0 0", wordBreak: "break-all", lineHeight: 1.2 }}>
                      {shredderVisibleText}
                    </p>
                  </div>
                )}

                {/* Shredder machine body and laser mouth */}
                <div className="shredder-mouth-base">
                  <div className="shredder-cutting-slit" style={{ display: shredderActive ? "block" : "none" }} />
                </div>

                {/* Shredded lines paper strips */}
                {shreddedLines.map((line, idx) => {
                  const offset = -75 + idx * 14; // spread columns
                  const spin = -15 + idx * 2.8 + (Math.random() - 0.5) * 8; // slanting strips
                  return (
                    <div
                      key={idx}
                      className="shredder-paper-strip"
                      style={{
                        left: `calc(50% + ${offset}px)`,
                        bottom: "35px",
                        "--fall-spin": `${spin}deg`
                      } as any}
                    >
                      {line}
                    </div>
                  );
                })}

                <div className="keyboard-hint" style={{ marginTop: "10px" }}>
                  {shredderActive ? (
                    <span style={{ color: "var(--accent-danger)", fontWeight: "bold" }}>
                      ⚙️ 碎纸齿轮传动中... 亲手消灭烦恼...
                    </span>
                  ) : (
                    <span>在右侧输入框写下不爽的事，拉动粉碎机！</span>
                  )}
                </div>
              </div>
            )}

            {/* TAB VIEW 2: Boss Simulator */}
            {activeTab === "boss" && (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                {/* Boss avatar svg */}
                <div className={`boss-svg-box is-${bossActiveAction}`}>
                  <svg viewBox="0 0 120 120" width="100%" height="100%">
                    {/* Head */}
                    <circle cx="60" cy="60" r="45" fill="url(#bossSkinGrad)" stroke="var(--border-strong)" strokeWidth="3" />
                    
                    {/* Angry corporate hair */}
                    <path d="M22,35 C35,15 85,15 98,35 C88,28 32,28 22,35 Z" fill="#374151" />
                    
                    {/* Eyebrows */}
                    {bossActiveAction === "dizzy" ? (
                      // dizzy spiral brows
                      <>
                        <path d="M38,48 Q45,45 42,52" fill="none" stroke="#000" strokeWidth="2.5" />
                        <path d="M82,48 Q75,45 78,52" fill="none" stroke="#000" strokeWidth="2.5" />
                      </>
                    ) : (
                      // angry brows
                      <>
                        <line x1="32" y1="46" x2="48" y2="52" stroke="#111827" strokeWidth="3.5" />
                        <line x1="88" y1="46" x2="72" y2="52" stroke="#111827" strokeWidth="3.5" />
                      </>
                    )}

                    {/* Eyes */}
                    {bossActiveAction === "dizzy" ? (
                      // spiral dizzy eyes
                      <>
                        <path d="M35,55 A6,6 0 1,0 47,55 A6,6 0 1,0 35,55 Z" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="3 2" />
                        <path d="M73,55 A6,6 0 1,0 85,55 A6,6 0 1,0 73,55 Z" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="3 2" />
                      </>
                    ) : (
                      <>
                        <circle cx="40" cy="56" r="6" fill="#111827" />
                        <circle cx="80" cy="56" r="6" fill="#111827" />
                      </>
                    )}

                    {/* Mouth */}
                    {bossActiveAction === "slam" || bossActiveAction === "shake" ? (
                      // wide open screaming mouth
                      <ellipse cx="60" cy="78" rx="12" ry="8" fill="#ef4444" stroke="#111827" strokeWidth="2" />
                    ) : bossActiveAction === "dizzy" ? (
                      // squiggly wavy mouth
                      <path d="M48,78 Q54,82 60,78 T72,78" fill="none" stroke="#111827" strokeWidth="3" />
                    ) : (
                      // grumpy mouth
                      <path d="M45,82 Q60,70 75,82" fill="none" stroke="#111827" strokeWidth="3.5" strokeLinecap="round" />
                    )}

                    {/* Specs / Glasses (representing boss look) */}
                    <rect x="25" y="49" width="30" height="14" rx="2" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
                    <rect x="65" y="49" width="30" height="14" rx="2" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
                    <line x1="55" y1="56" x2="65" y2="56" stroke="#fbbf24" strokeWidth="2.5" />

                    <defs>
                      <linearGradient id="bossSkinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffedd5" />
                        <stop offset="60%" stopColor="#fed7aa" />
                        <stop offset="100%" stopColor="#fdba74" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Displaying Boss's bubble quote speech */}
                <div 
                  style={{ 
                    background: "rgba(6, 14, 22, 0.4)", 
                    border: "1px dashed var(--border-default)", 
                    borderRadius: "var(--radius-md)", 
                    padding: "8px 14px", 
                    marginTop: "1.2rem", 
                    maxWidth: "280px", 
                    fontSize: "0.78rem", 
                    textAlign: "center",
                    lineHeight: 1.45,
                    color: bossActiveAction === "dizzy" ? "var(--accent-primary)" : "var(--text-primary)"
                  }}
                >
                  {bossMessage}
                </div>
              </div>
            )}

            {/* TAB VIEW 3: Sarcastic Clapper */}
            {activeTab === "clapper" && (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
                {/* Visual clapper icon */}
                <div style={{ position: "relative", width: "95px", height: "95px", marginBottom: "1rem" }}>
                  <svg viewBox="0 0 100 100" width="100%" height="100%">
                    <circle cx="50" cy="50" r="45" fill="rgba(56, 189, 248, 0.08)" stroke="var(--accent-secondary)" strokeWidth="2.5" strokeDasharray="4 2" />
                    {/* Thumbs up thumb */}
                    <path d="M35,65 L35,45 A6,6 0 0,1 41,39 L46,39 L45,30 A5,5 0 0,1 50,25 L55,25 A5,5 0 0,1 60,30 L58,45 L72,45 A6,6 0 0,1 78,51 L72,75 A6,6 0 0,1 66,80 L35,80" fill="none" stroke="var(--accent-secondary)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* Sarcastic text bubble */}
                <div 
                  style={{ 
                    background: "rgba(56, 189, 248, 0.04)", 
                    borderLeft: "4px solid var(--accent-secondary)", 
                    borderRadius: "0 var(--radius-md) var(--radius-md) 0",
                    padding: "12px 18px", 
                    fontSize: "0.82rem", 
                    textAlign: "left",
                    lineHeight: 1.5,
                    color: "var(--text-primary)",
                    maxWidth: "300px"
                  }}
                >
                  💬 <strong>点赞密语:</strong>
                  <p style={{ margin: "6px 0 0 0" }}>{sarcasticQuote}</p>
                </div>
              </div>
            )}

            {/* TAB VIEW 4: Megaphone to Void */}
            {activeTab === "megaphone" && (
              <div className={`is-screaming`} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-around", padding: "1rem" }}>
                {/* 1. Megaphone Vector */}
                <div style={{ width: "120px", height: "120px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ transform: "rotate(-25deg)" }}>
                    {/* Body cone */}
                    <path d="M25,45 L58,35 L68,65 L25,55 Z" fill="url(#megaConeGrad)" stroke="var(--border-strong)" strokeWidth="2.5" />
                    {/* Ring head */}
                    <ellipse cx="68" cy="50" rx="6" ry="15" fill="#f43f5e" stroke="var(--border-strong)" strokeWidth="2" />
                    {/* Handle */}
                    <path d="M35,52 L35,72 C35,74 38,76 40,76 L40,52 Z" fill="#4b5563" />

                    <defs>
                      <linearGradient id="megaConeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e2e8f0" />
                        <stop offset="100%" stopColor="#cbd5e1" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Flying Letters heading to the void */}
                {screamLetters.map((item) => (
                  <div
                    key={item.id}
                    className="scream-letter-unit"
                    style={{
                      "--drift-x": `${item.angle * 1.5}px`,
                      animationDelay: `${item.id * 0.06}s`
                    } as any}
                  >
                    {item.char}
                  </div>
                ))}

                {/* 2. Void Rotating Blackhole */}
                <div className="void-blackhole-svg">
                  <svg viewBox="0 0 120 120" width="100%" height="100%">
                    <circle cx="60" cy="60" r="50" fill="#000" stroke="#c084fc" strokeWidth="3" strokeDasharray="6 3" />
                    <circle cx="60" cy="60" r="30" fill="#090d16" stroke="#c084fc" strokeWidth="2" />
                    <circle cx="60" cy="60" r="10" fill="#000" />
                  </svg>
                </div>
              </div>
            )}

            {/* TAB VIEW 5: Regret Pill */}
            {activeTab === "regret" && (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                
                {/* Swirling Warp overlay when swallowing pill */}
                {isWarping && <div className="time-warp-overlay" />}

                {/* Bottle of Regret pills SVG */}
                <div style={{ width: "110px", height: "140px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <svg viewBox="0 0 100 120" width="100%" height="100%">
                    {/* Bottle cap */}
                    <rect x="35" y="10" width="30" height="8" fill="#e2e8f0" stroke="#4b5563" strokeWidth="2" rx="1" />
                    {/* Bottle body (translucent glass) */}
                    <path d="M25,25 L75,25 C80,25 85,30 85,38 L85,102 C85,110 80,115 75,115 L25,115 C20,115 15,110 15,102 L15,38 C15,30 20,25 25,25 Z" fill="rgba(255,255,255,0.06)" stroke="var(--border-strong)" strokeWidth="3.5" />
                    {/* Label */}
                    <rect x="25" y="48" width="50" height="42" fill="#c084fc" rx="2" />
                    <text x="50" y="74" fill="#000" fontSize="11" fontWeight="bold" textAnchor="middle">
                      后悔药
                    </text>
                    <text x="50" y="85" fill="#fff" fontSize="6.5" textAnchor="middle">
                      时光回滚剂
                    </text>
                  </svg>
                </div>

                {/* Time warp status overlay */}
                {warpStatus && (
                  <div 
                    style={{ 
                      marginTop: "1.2rem", 
                      fontSize: "0.78rem", 
                      color: "var(--accent-primary)", 
                      background: "rgba(192, 132, 252, 0.05)",
                      border: "1px dashed var(--accent-primary)",
                      padding: "8px 12px", 
                      borderRadius: "6px",
                      maxWidth: "280px",
                      textAlign: "center"
                    }}
                  >
                    {warpStatus}
                  </div>
                )}
              </div>
            )}

            {/* TAB VIEW 6: Cyber Merit Donation Box */}
            {activeTab === "karma" && (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                
                {/* Drag-slot Coin */}
                <div 
                  className={`karma-coin ${isCoinInSlot ? "is-dropping" : ""}`}
                  onMouseDown={() => {
                    if (!isCoinInSlot) handleDropCoin();
                  }}
                  title="点击将硬币投入功德箱"
                />

                {/* Golden Wooden Merit Box SVG */}
                <svg 
                  viewBox="0 0 200 200" 
                  className="karma-box-svg"
                  onClick={handleDropCoin}
                >
                  <defs>
                    <linearGradient id="karmaBoxWood" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ab714b" />
                      <stop offset="60%" stopColor="#875331" />
                      <stop offset="100%" stopColor="#5c3922" />
                    </linearGradient>
                  </defs>

                  {/* Main Box body */}
                  <rect x="40" y="60" width="120" height="120" rx="8" />
                  
                  {/* Coin inlet slot */}
                  <rect x="80" y="80" width="40" height="7" rx="3.5" fill="#111827" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  
                  {/* Golden Chinese emblem "功德箱" */}
                  <rect x="65" y="110" width="70" height="42" fill="#fbbf24" rx="4" />
                  <text x="100" y="136" fill="#78350f" fontSize="15" fontWeight="bold" textAnchor="middle" letterSpacing="2">
                    功德箱
                  </text>
                </svg>

                <div className="keyboard-hint" style={{ marginTop: "10px" }}>
                  <span>点击投币孔或木箱，为赛博宇宙打入功德福报</span>
                </div>
              </div>
            )}

          </div>

          {/* Actions Reset Row */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              type="button" 
              onClick={() => {
                setCyberMerit(0);
                setShredCount(0);
                setRebelCount(0);
              }} 
              className="button--danger" 
              style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-full)" }}
            >
              清空我的功德和爽快值数据
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* RIGHT COLUMN: Tab controls and configurations */}
        {/* ==================================================== */}
        <div className="vent-card" style={{ gap: "1.2rem" }}>
          <h3 className="section-title" style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
            玩具配置面板
          </h3>

          {/* 1. Shredder Panel */}
          {activeTab === "shredder" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label className="tool-field">
                <span>烦恼怨气输入 (Write Your Worries)</span>
                <textarea
                  rows={4}
                  value={worryInput}
                  onChange={(e) => setWorryInput(e.target.value)}
                  placeholder="写下烦恼（如：天天写周报、修改了8遍的UI设计、深夜服务器又崩溃了），拉动粉碎机碾碎它们..."
                  style={{ width: "100%", fontSize: "0.8rem", padding: "8px" }}
                  disabled={shredderActive}
                />
              </label>

              <button
                type="button"
                className="button--primary"
                onClick={handleShred}
                disabled={shredderActive || !worryInput.trim()}
                style={{ width: "100%", borderRadius: "var(--radius-full)", padding: "10px" }}
              >
                {shredderActive ? "⚠️ 粉碎机全速运转中..." : "⚔️ 拉动粉碎机阀门"}
              </button>
            </div>
          )}

          {/* 2. Boss Sim Panel */}
          {activeTab === "boss" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: "bold" }}>
                动作触发指令 (Boss Commands)
              </span>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handleBossAction("pie")}
                  style={{ width: "100%", borderRadius: "8px", padding: "10px", textAlign: "left", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span>🥖</span>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "0.8rem" }}>让老板画饼 (Draw Corporate Pie)</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}>随机触发一段经典职场赋能闭环话术</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleBossAction("wechat")}
                  style={{ width: "100%", borderRadius: "8px", padding: "10px", textAlign: "left", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span>💬</span>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "0.8rem" }}>微信催命震动 (Send Alert)</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}>模拟老板在深夜发来的加急改需求通知</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleBossAction("slam")}
                  style={{ width: "100%", borderRadius: "8px", padding: "10px", textAlign: "left", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span>🔨</span>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "0.8rem" }}>老板大怒拍桌 (Slam Desk)</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}>触发老板暴怒摔杯拍桌怒斥痛点动作</div>
                  </div>
                </button>

                <button
                  type="button"
                  className="button--primary"
                  onClick={() => handleBossAction("rebel")}
                  style={{ width: "100%", borderRadius: "var(--radius-full)", padding: "10px", marginTop: "8px" }}
                >
                  💥 键盘大反击 (Rebel Clash!)
                </button>
              </div>
            </div>
          )}

          {/* 3. Sarcastic clapper panel */}
          {activeTab === "clapper" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                className="button--primary"
                onClick={handleSarcasticClap}
                style={{ width: "100%", borderRadius: "var(--radius-full)", padding: "12px", fontSize: "0.85rem" }}
              >
                👏 献上赛博赞赏 (Get Praise)
              </button>
              <p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", textAlign: "center", margin: 0 }}>
                每一次点击，系统将随机合成一条带有深度阴阳怪气的高级职场赞美。
              </p>
            </div>
          )}

          {/* 4. Megaphone to Void panel */}
          {activeTab === "megaphone" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label className="tool-field">
                <span>呐喊宣泄内容 (What to Scream)</span>
                <input
                  type="text"
                  maxLength={25}
                  value={screamInput}
                  onChange={(e) => setScreamInput(e.target.value)}
                  placeholder="我不想写报告！我想下班！！"
                  style={{ width: "100%", fontSize: "0.8rem", padding: "8px 10px" }}
                  disabled={isScreaming}
                />
              </label>

              <button
                type="button"
                className="button--primary"
                onClick={handleMegaphoneScream}
                disabled={isScreaming || !screamInput.trim()}
                style={{ width: "100%", borderRadius: "var(--radius-full)", padding: "10px" }}
              >
                {isScreaming ? "🌌 呐喊音波消散在虚无中..." : "📢 朝着虚空呐喊"}
              </button>
            </div>
          )}

          {/* 5. Regret Pill panel */}
          {activeTab === "regret" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label className="tool-field">
                <span>选择吞服后悔药时间回滚事件</span>
                <select
                  value={selectedRegret}
                  onChange={(e) => setSelectedRegret(e.target.value)}
                  style={{ width: "100%" }}
                  disabled={isWarping}
                >
                  {REGRET_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.text}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="button--primary"
                onClick={handleSwallowPill}
                disabled={isWarping}
                style={{ width: "100%", borderRadius: "var(--radius-full)", padding: "11px" }}
              >
                {isWarping ? "⏳ 时空逆转光幕中..." : "💊 吞服后悔药 (Reset Regret)"}
              </button>
            </div>
          )}

          {/* 6. Cyber Merit Donation Box info */}
          {activeTab === "karma" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div 
                style={{ 
                  background: "rgba(251, 191, 36, 0.05)", 
                  border: "1px dashed var(--accent-warning)", 
                  borderRadius: "var(--radius-md)", 
                  padding: "12px", 
                  fontSize: "0.78rem", 
                  lineHeight: 1.45, 
                  color: "var(--text-primary)" 
                }}
              >
                📌 <strong>投币积德须知:</strong>
                <p style={{ margin: "4px 0 0 0" }}>
                  点击金币或摇晃功德箱，可以将功德硬币滑入功德箱中。每一次成功的投币，将为你自动累加 100 功德分，并触发以太坊神界账本同步。
                </p>
              </div>

              <button
                type="button"
                className="button--primary"
                onClick={handleDropCoin}
                style={{ width: "100%", borderRadius: "var(--radius-full)", padding: "10px" }}
              >
                🪙 投入功德金币 (Insert Coin)
              </button>
            </div>
          )}

          {/* Zen Ambience audio controller */}
          <div className="tool-field">
            <span>禅林背景音声 (Zen Ambience)</span>
            <select
              value={ambientSounds}
              onChange={(e) => setAmbientSounds(e.target.value as any)}
              style={{ width: "100%" }}
            >
              <option value="none">无背景音 (Silence)</option>
              <option value="bell">铜磬钟鸣 (Temple Bell - 每 25s)</option>
              <option value="wind">五声风铃 (Windchimes - 随机)</option>
            </select>
          </div>

          {/* Mindfulness breathing guide pulse */}
          <div className="breath-trainer" style={{ marginTop: "4px" }}>
            <div className="breath-coach-ring">
              <div className="breath-coach-core" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: "bold", color: "var(--text-primary)" }}>
                冥想深呼吸同步仪
              </span>
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.3 }}>
                小球向外扩张时深吸气，向内收缩时深呼气。消解焦虑。
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
