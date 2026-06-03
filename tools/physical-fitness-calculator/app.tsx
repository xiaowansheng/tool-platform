"use client";

import { useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

type Gender = "M" | "F";
type Grade = "1-2" | "3-4";

// ==========================================
// 评分标准数据表 (大一/大二 M_1-2, 大三/大四 M_3-4 等)
// ==========================================

const VITAL_CAPACITY_M_1_2 = [
  { std: 2800, score: 60 }, { std: 2900, score: 62 }, { std: 3000, score: 64 }, { std: 3100, score: 66 },
  { std: 3200, score: 68 }, { std: 3320, score: 70 }, { std: 3440, score: 72 }, { std: 3560, score: 74 },
  { std: 3680, score: 76 }, { std: 3800, score: 78 }, { std: 4050, score: 80 }, { std: 4300, score: 85 },
  { std: 4550, score: 90 }, { std: 4800, score: 95 }, { std: 5040, score: 100 }
];
const VITAL_CAPACITY_M_3_4 = [
  { std: 2850, score: 60 }, { std: 2950, score: 62 }, { std: 3050, score: 64 }, { std: 3150, score: 66 },
  { std: 3250, score: 68 }, { std: 3370, score: 70 }, { std: 3490, score: 72 }, { std: 3610, score: 74 },
  { std: 3730, score: 76 }, { std: 3850, score: 78 }, { std: 4100, score: 80 }, { std: 4350, score: 85 },
  { std: 4600, score: 90 }, { std: 4850, score: 95 }, { std: 5100, score: 100 }
];
const VITAL_CAPACITY_F_1_2 = [
  { std: 1800, score: 60 }, { std: 1900, score: 62 }, { std: 2000, score: 64 }, { std: 2110, score: 66 },
  { std: 2230, score: 68 }, { std: 2350, score: 70 }, { std: 2470, score: 72 }, { std: 2590, score: 74 },
  { std: 2710, score: 76 }, { std: 2830, score: 78 }, { std: 2950, score: 80 }, { std: 3100, score: 85 },
  { std: 3250, score: 90 }, { std: 3400, score: 95 }, { std: 3570, score: 100 }
];
const VITAL_CAPACITY_F_3_4 = [
  { std: 1850, score: 60 }, { std: 1950, score: 62 }, { std: 2050, score: 64 }, { std: 2160, score: 66 },
  { std: 2280, score: 68 }, { std: 2400, score: 70 }, { std: 2520, score: 72 }, { std: 2640, score: 74 },
  { std: 2760, score: 76 }, { std: 2880, score: 78 }, { std: 3000, score: 80 }, { std: 3150, score: 85 },
  { std: 3300, score: 90 }, { std: 3450, score: 95 }, { std: 3620, score: 100 }
];

const SPRINT_50M_M_1_2 = [
  { std: 9.1, score: 60 }, { std: 8.9, score: 62 }, { std: 8.7, score: 64 }, { std: 8.5, score: 66 },
  { std: 8.3, score: 68 }, { std: 8.1, score: 70 }, { std: 7.9, score: 72 }, { std: 7.7, score: 74 },
  { std: 7.5, score: 76 }, { std: 7.3, score: 78 }, { std: 7.1, score: 80 }, { std: 7.0, score: 85 },
  { std: 6.9, score: 90 }, { std: 6.8, score: 95 }, { std: 6.7, score: 100 }
];
const SPRINT_50M_M_3_4 = [
  { std: 9.0, score: 60 }, { std: 8.8, score: 62 }, { std: 8.6, score: 64 }, { std: 8.4, score: 66 },
  { std: 8.2, score: 68 }, { std: 8.0, score: 70 }, { std: 7.8, score: 72 }, { std: 7.6, score: 74 },
  { std: 7.4, score: 76 }, { std: 7.2, score: 78 }, { std: 7.0, score: 80 }, { std: 6.9, score: 85 },
  { std: 6.8, score: 90 }, { std: 6.7, score: 95 }, { std: 6.6, score: 100 }
];
const SPRINT_50M_F_1_2 = [
  { std: 10.3, score: 60 }, { std: 10.1, score: 62 }, { std: 9.9, score: 64 }, { std: 9.7, score: 66 },
  { std: 9.5, score: 68 }, { std: 9.3, score: 70 }, { std: 9.1, score: 72 }, { std: 8.9, score: 74 },
  { std: 8.7, score: 76 }, { std: 8.5, score: 78 }, { std: 8.3, score: 80 }, { std: 8.1, score: 85 },
  { std: 7.7, score: 90 }, { std: 7.6, score: 95 }, { std: 7.5, score: 100 }
];
const SPRINT_50M_F_3_4 = [
  { std: 10.2, score: 60 }, { std: 10.0, score: 62 }, { std: 9.8, score: 64 }, { std: 9.6, score: 66 },
  { std: 9.4, score: 68 }, { std: 9.2, score: 70 }, { std: 9.0, score: 72 }, { std: 8.8, score: 74 },
  { std: 8.6, score: 76 }, { std: 8.4, score: 78 }, { std: 8.2, score: 80 }, { std: 8.0, score: 85 },
  { std: 7.6, score: 90 }, { std: 7.5, score: 95 }, { std: 7.4, score: 100 }
];

const STANDING_JUMP_M_1_2 = [
  { std: 208, score: 60 }, { std: 212, score: 62 }, { std: 216, score: 64 }, { std: 220, score: 66 },
  { std: 224, score: 68 }, { std: 228, score: 70 }, { std: 232, score: 72 }, { std: 236, score: 74 },
  { std: 240, score: 76 }, { std: 244, score: 78 }, { std: 248, score: 80 }, { std: 256, score: 85 },
  { std: 263, score: 90 }, { std: 268, score: 95 }, { std: 273, score: 100 }
];
const STANDING_JUMP_M_3_4 = [
  { std: 210, score: 60 }, { std: 214, score: 62 }, { std: 218, score: 64 }, { std: 222, score: 66 },
  { std: 226, score: 68 }, { std: 230, score: 70 }, { std: 234, score: 72 }, { std: 238, score: 74 },
  { std: 242, score: 76 }, { std: 246, score: 78 }, { std: 250, score: 80 }, { std: 258, score: 85 },
  { std: 265, score: 90 }, { std: 270, score: 95 }, { std: 275, score: 100 }
];
const STANDING_JUMP_F_1_2 = [
  { std: 151, score: 60 }, { std: 154, score: 62 }, { std: 157, score: 64 }, { std: 160, score: 66 },
  { std: 163, score: 68 }, { std: 166, score: 70 }, { std: 169, score: 72 }, { std: 172, score: 74 },
  { std: 175, score: 76 }, { std: 178, score: 78 }, { std: 181, score: 80 }, { std: 188, score: 85 },
  { std: 195, score: 90 }, { std: 201, score: 95 }, { std: 207, score: 100 }
];
const STANDING_JUMP_F_3_4 = [
  { std: 152, score: 60 }, { std: 155, score: 62 }, { std: 158, score: 64 }, { std: 161, score: 66 },
  { std: 164, score: 68 }, { std: 167, score: 70 }, { std: 170, score: 72 }, { std: 173, score: 74 },
  { std: 176, score: 76 }, { std: 179, score: 78 }, { std: 182, score: 80 }, { std: 189, score: 85 },
  { std: 196, score: 90 }, { std: 202, score: 95 }, { std: 208, score: 100 }
];

const SIT_AND_REACH_M_1_2 = [
  { std: 3.7, score: 60 }, { std: 5.0, score: 62 }, { std: 6.3, score: 64 }, { std: 7.6, score: 66 },
  { std: 8.8, score: 68 }, { std: 10.0, score: 70 }, { std: 11.2, score: 72 }, { std: 12.4, score: 74 },
  { std: 13.6, score: 76 }, { std: 14.8, score: 78 }, { std: 16.0, score: 80 }, { std: 18.7, score: 85 },
  { std: 21.3, score: 90 }, { std: 23.1, score: 95 }, { std: 24.9, score: 100 }
];
const SIT_AND_REACH_M_3_4 = [
  { std: 4.2, score: 60 }, { std: 5.5, score: 62 }, { std: 6.8, score: 64 }, { std: 8.1, score: 66 },
  { std: 9.3, score: 68 }, { std: 10.5, score: 70 }, { std: 11.7, score: 72 }, { std: 12.9, score: 74 },
  { std: 14.1, score: 76 }, { std: 15.3, score: 78 }, { std: 16.5, score: 80 }, { std: 19.2, score: 85 },
  { std: 21.8, score: 90 }, { std: 23.6, score: 95 }, { std: 25.4, score: 100 }
];
const SIT_AND_REACH_F_1_2 = [
  { std: 6.0, score: 60 }, { std: 7.2, score: 62 }, { std: 8.4, score: 64 }, { std: 9.6, score: 66 },
  { std: 10.8, score: 68 }, { std: 12.0, score: 70 }, { std: 13.1, score: 72 }, { std: 14.2, score: 74 },
  { std: 15.3, score: 76 }, { std: 16.4, score: 78 }, { std: 17.5, score: 80 }, { std: 19.9, score: 85 },
  { std: 22.4, score: 90 }, { std: 24.1, score: 95 }, { std: 25.8, score: 100 }
];
const SIT_AND_REACH_F_3_4 = [
  { std: 6.5, score: 60 }, { std: 7.7, score: 62 }, { std: 8.9, score: 64 }, { std: 10.1, score: 66 },
  { std: 11.3, score: 68 }, { std: 12.5, score: 70 }, { std: 13.6, score: 72 }, { std: 14.7, score: 74 },
  { std: 15.8, score: 76 }, { std: 16.9, score: 78 }, { std: 18.0, score: 80 }, { std: 20.4, score: 85 },
  { std: 22.9, score: 90 }, { std: 24.6, score: 95 }, { std: 26.3, score: 100 }
];

const RUN_M_1_2 = [
  { std: 272, score: 60 }, { std: 267, score: 62 }, { std: 262, score: 64 }, { std: 257, score: 66 },
  { std: 252, score: 68 }, { std: 247, score: 70 }, { std: 242, score: 72 }, { std: 237, score: 74 },
  { std: 232, score: 76 }, { std: 227, score: 78 }, { std: 222, score: 80 }, { std: 214, score: 85 },
  { std: 207, score: 90 }, { std: 202, score: 95 }, { std: 197, score: 100 }
];
const RUN_M_3_4 = [
  { std: 270, score: 60 }, { std: 265, score: 62 }, { std: 260, score: 64 }, { std: 255, score: 66 },
  { std: 250, score: 68 }, { std: 245, score: 70 }, { std: 240, score: 72 }, { std: 235, score: 74 },
  { std: 230, score: 76 }, { std: 225, score: 78 }, { std: 220, score: 80 }, { std: 212, score: 85 },
  { std: 205, score: 90 }, { std: 200, score: 95 }, { std: 195, score: 100 }
];
const RUN_F_1_2 = [
  { std: 274, score: 60 }, { std: 269, score: 62 }, { std: 264, score: 64 }, { std: 259, score: 66 },
  { std: 254, score: 68 }, { std: 249, score: 70 }, { std: 244, score: 72 }, { std: 239, score: 74 },
  { std: 234, score: 76 }, { std: 229, score: 78 }, { std: 224, score: 80 }, { std: 214, score: 85 },
  { std: 204, score: 90 }, { std: 201, score: 95 }, { std: 198, score: 100 }
];
const RUN_F_3_4 = [
  { std: 272, score: 60 }, { std: 267, score: 62 }, { std: 262, score: 64 }, { std: 257, score: 66 },
  { std: 252, score: 68 }, { std: 247, score: 70 }, { std: 242, score: 72 }, { std: 237, score: 74 },
  { std: 232, score: 76 }, { std: 227, score: 78 }, { std: 222, score: 80 }, { std: 212, score: 85 },
  { std: 202, score: 90 }, { std: 199, score: 95 }, { std: 196, score: 100 }
];

const STRENGTH_M_1_2 = [
  { std: 10, score: 60 }, { std: 11, score: 64 }, { std: 12, score: 68 }, { std: 13, score: 72 },
  { std: 14, score: 76 }, { std: 15, score: 80 }, { std: 16, score: 85 }, { std: 17, score: 90 },
  { std: 18, score: 95 }, { std: 19, score: 100 }
];
const STRENGTH_M_3_4 = [
  { std: 11, score: 60 }, { std: 12, score: 64 }, { std: 13, score: 68 }, { std: 14, score: 72 },
  { std: 15, score: 76 }, { std: 16, score: 80 }, { std: 17, score: 85 }, { std: 18, score: 90 },
  { std: 19, score: 95 }, { std: 20, score: 100 }
];
const STRENGTH_F_1_2 = [
  { std: 26, score: 60 }, { std: 28, score: 62 }, { std: 30, score: 64 }, { std: 32, score: 66 },
  { std: 34, score: 68 }, { std: 36, score: 70 }, { std: 38, score: 72 }, { std: 40, score: 74 },
  { std: 42, score: 76 }, { std: 44, score: 78 }, { std: 46, score: 80 }, { std: 49, score: 85 },
  { std: 52, score: 90 }, { std: 54, score: 95 }, { std: 56, score: 100 }
];
const STRENGTH_F_3_4 = [
  { std: 27, score: 60 }, { std: 29, score: 62 }, { std: 31, score: 64 }, { std: 33, score: 66 },
  { std: 35, score: 68 }, { std: 37, score: 70 }, { std: 39, score: 72 }, { std: 41, score: 74 },
  { std: 43, score: 76 }, { std: 45, score: 78 }, { std: 47, score: 80 }, { std: 50, score: 85 },
  { std: 53, score: 90 }, { std: 55, score: 95 }, { std: 57, score: 100 }
];

function getTable(gender: Gender, grade: Grade, type: string) {
  const key = `${gender}_${grade}`;
  switch (type) {
    case "vital":
      return key === "M_1-2" ? VITAL_CAPACITY_M_1_2 : key === "M_3-4" ? VITAL_CAPACITY_M_3_4 : key === "F_1-2" ? VITAL_CAPACITY_F_1_2 : VITAL_CAPACITY_F_3_4;
    case "sprint":
      return key === "M_1-2" ? SPRINT_50M_M_1_2 : key === "M_3-4" ? SPRINT_50M_M_3_4 : key === "F_1-2" ? SPRINT_50M_F_1_2 : SPRINT_50M_F_3_4;
    case "jump":
      return key === "M_1-2" ? STANDING_JUMP_M_1_2 : key === "M_3-4" ? STANDING_JUMP_M_3_4 : key === "F_1-2" ? STANDING_JUMP_F_1_2 : STANDING_JUMP_F_3_4;
    case "reach":
      return key === "M_1-2" ? SIT_AND_REACH_M_1_2 : key === "M_3-4" ? SIT_AND_REACH_M_3_4 : key === "F_1-2" ? SIT_AND_REACH_F_1_2 : SIT_AND_REACH_F_3_4;
    case "run":
      return key === "M_1-2" ? RUN_M_1_2 : key === "M_3-4" ? RUN_M_3_4 : key === "F_1-2" ? RUN_F_1_2 : RUN_F_3_4;
    case "strength":
      return key === "M_1-2" ? STRENGTH_M_1_2 : key === "M_3-4" ? STRENGTH_M_3_4 : key === "F_1-2" ? STRENGTH_F_1_2 : STRENGTH_F_3_4;
    default:
      return [];
  }
}

function getInterpolatedScore(value: number, table: { std: number; score: number }[], ascending = true): number {
  if (table.length === 0) return 0;

  const sorted = [...table].sort((a, b) => ascending ? a.std - b.std : b.std - a.std);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];

  if (ascending) {
    if (value <= worst.std) {
      return Math.max(0, Math.round((value / worst.std) * worst.score));
    }
    if (value >= best.std) return best.score;

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (value >= current.std && value <= next.std) {
        const ratio = (value - current.std) / (next.std - current.std);
        return Math.round(current.score + ratio * (next.score - current.score));
      }
    }
  } else {
    if (value >= worst.std) {
      if (value > worst.std * 1.5) return 0;
      const failRatio = (worst.std * 1.5 - value) / (worst.std * 0.5);
      return Math.max(0, Math.round(failRatio * worst.score));
    }
    if (value <= best.std) return best.score;

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (value <= current.std && value >= next.std) {
        const ratio = (current.std - value) / (current.std - next.std);
        return Math.round(current.score + ratio * (next.score - current.score));
      }
    }
  }
  return 0;
}

function getBmiScore(bmi: number, gender: Gender): { score: number; label: string; color: string } {
  if (gender === "M") {
    if (bmi < 17.9) return { score: 80, label: "体重过轻", color: "#eab308" };
    if (bmi <= 23.9) return { score: 100, label: "体重正常", color: "#10b981" };
    if (bmi <= 27.9) return { score: 80, label: "体重超重", color: "#f97316" };
    return { score: 60, label: "肥胖", color: "#ef4444" };
  } else {
    if (bmi < 17.2) return { score: 80, label: "体重过轻", color: "#eab308" };
    if (bmi <= 23.9) return { score: 100, label: "体重正常", color: "#10b981" };
    if (bmi <= 27.9) return { score: 80, label: "体重超重", color: "#f97316" };
    return { score: 60, label: "肥胖", color: "#ef4444" };
  }
}

function getLevel(score: number): { label: string; color: string; bg: string; grad: string } {
  if (score >= 90) return { label: "优秀", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", grad: "linear-gradient(135deg, #10b981, #059669)" };
  if (score >= 80) return { label: "良好", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", grad: "linear-gradient(135deg, #3b82f6, #2563eb)" };
  if (score >= 60) return { label: "及格", color: "#f97316", bg: "rgba(249, 115, 22, 0.15)", grad: "linear-gradient(135deg, #f97316, #ea580c)" };
  return { label: "不及格", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", grad: "linear-gradient(135deg, #ef4444, #dc2626)" };
}

function getItemLevel(score: number): string {
  if (score >= 90) return "优秀";
  if (score >= 80) return "良好";
  if (score >= 60) return "及格";
  return "不及格";
}

export default function PhysicalFitnessCalculatorTool({ manifest }: ToolAppProps) {
  const [gender, setGender] = useState<Gender>("M");
  const [grade, setGrade] = useState<Grade>("1-2");

  // 表单状态
  const [height, setHeight] = useState<string>("175");
  const [weight, setWeight] = useState<string>("65");
  const [vitalCapacity, setVitalCapacity] = useState<string>("4200");
  const [sprint50, setSprint50] = useState<string>("7.2");
  const [standingJump, setStandingJump] = useState<string>("240");
  const [sitAndReach, setSitAndReach] = useState<string>("15.5");
  // 1000m/800m
  const [runMin, setRunMin] = useState<string>("3");
  const [runSec, setRunSec] = useState<string>("45");
  // 引体/仰卧
  const [strengthReps, setStrengthReps] = useState<string>("12");

  // ==========================================
  // 计算逻辑
  // ==========================================
  const hNum = parseFloat(height) || 0;
  const wNum = parseFloat(weight) || 0;
  const bmiVal = hNum > 0 ? wNum / ((hNum / 100) * (hNum / 100)) : 0;
  const bmiInfo = getBmiScore(bmiVal, gender);

  const vitalNum = parseFloat(vitalCapacity) || 0;
  const vitalScore = getInterpolatedScore(vitalNum, getTable(gender, grade, "vital"), true);

  const sprintNum = parseFloat(sprint50) || 0;
  const sprintScore = getInterpolatedScore(sprintNum, getTable(gender, grade, "sprint"), false);

  const jumpNum = parseFloat(standingJump) || 0;
  const jumpScore = getInterpolatedScore(jumpNum, getTable(gender, grade, "jump"), true);

  const reachNum = parseFloat(sitAndReach) || 0;
  const reachScore = getInterpolatedScore(reachNum, getTable(gender, grade, "reach"), true);

  const rMinNum = parseInt(runMin, 10) || 0;
  const rSecNum = parseInt(runSec, 10) || 0;
  const runTotalSeconds = rMinNum * 60 + rSecNum;
  const runScore = getInterpolatedScore(runTotalSeconds, getTable(gender, grade, "run"), false);

  const strengthNum = parseInt(strengthReps, 10) || 0;
  const strengthScore = getInterpolatedScore(strengthNum, getTable(gender, grade, "strength"), true);

  // 加分项计算 (长跑和力量项目超出100分标准可加分，上限各10分)
  let runBonus = 0;
  if (runScore === 100) {
    const runStd100 = getTable(gender, grade, "run").find(e => e.score === 100)?.std ?? 0;
    if (runStd100 > 0 && runTotalSeconds < runStd100) {
      // 没2秒加1分
      runBonus = Math.min(10, Math.floor((runStd100 - runTotalSeconds) / 2));
    }
  }

  let strengthBonus = 0;
  if (strengthScore === 100) {
    const strengthStd100 = getTable(gender, grade, "strength").find(e => e.score === 100)?.std ?? 0;
    if (strengthStd100 > 0 && strengthNum > strengthStd100) {
      // 每多1次加1分
      strengthBonus = Math.min(10, strengthNum - strengthStd100);
    }
  }

  // 权重计算
  // BMI: 15% | 肺活量: 15% | 50米: 20% | 立定跳远: 10% | 坐位体前屈: 10% | 长跑: 20% | 力量/耐力: 10%
  const standardTotalScore = (
    bmiInfo.score * 0.15 +
    vitalScore * 0.15 +
    sprintScore * 0.20 +
    jumpScore * 0.10 +
    reachScore * 0.10 +
    runScore * 0.20 +
    strengthScore * 0.10
  );

  const totalScore = Math.min(120, Math.round(standardTotalScore + runBonus + strengthBonus));
  const levelInfo = getLevel(totalScore);

  // 动态建议生成
  const advices: string[] = [];
  if (bmiVal >= 24) advices.push("【身体质量】BMI处于超重或肥胖区间。建议加强慢跑、游泳等有氧耐力运动，适当调节饮食结构，减少高脂高糖摄入。");
  if (bmiVal > 0 && bmiVal < 17.5) advices.push("【身体质量】BMI偏低。建议合理补充优质蛋白质与热量，并配合适度抗阻力量训练，增强肌肉质量。");
  if (vitalScore < 70) advices.push("【心肺功能】肺活量得分较低。建议进行快走、跑步或深呼吸练习，有助于提高胸廓弹性和心肺吸氧量。");
  if (sprintScore < 70) advices.push("【速度爆发】50米跑成绩较弱。建议通过短程冲刺跑（如30米高抬腿冲刺）以及腰腹核心爆发力练习来提高速度。");
  if (jumpScore < 70) advices.push("【下肢力量】立定跳远成绩较低。建议进行深蹲跳、蛙跳、跳绳等练习，增强股四头肌和爆发力。");
  if (reachScore < 70) advices.push("【柔韧素质】坐位体前屈成绩较低。建议每天进行全身拉伸（如站姿前屈、坐姿单腿拉伸），每次维持20-30秒，逐步提高肌腱柔韧度。");
  if (runScore < 70) advices.push("【心肺耐力】中长跑耐力得分偏低。建议规律性地进行1500米至3000米慢跑训练，掌握均匀呼吸节奏与步伐频率。");
  if (strengthScore < 70) {
    if (gender === "M") {
      advices.push("【上肢力量】引体向上个数较少。建议练习哑铃划船、高位下拉或斜身引体，逐步增强背部与双臂肌肉力量。");
    } else {
      advices.push("【核心力量】仰卧起坐个数较少。建议加强腰腹核心锻炼，如平板支撑、卷腹以及仰卧抬腿，提升腹肌耐力。");
    }
  }

  // 重置表单
  function handleReset() {
    setHeight("175");
    setWeight("65");
    setVitalCapacity("4200");
    setSprint50("7.2");
    setStandingJump("240");
    setSitAndReach("15.5");
    setRunMin("3");
    setRunSec("45");
    setStrengthReps("12");
  }

  return (
    <section className="tool-panel">
      <style>{`
        .gender-tabs, .grade-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .tab-btn {
          flex: 1;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          text-align: center;
        }
        [data-theme="light"] .tab-btn {
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(0, 0, 0, 0.03);
          color: #475569;
        }
        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        [data-theme="light"] .tab-btn:hover {
          background: rgba(0, 0, 0, 0.06);
        }
        .tab-btn.active {
          background: var(--brand-primary, #6366f1);
          color: #ffffff;
          border-color: var(--brand-primary, #6366f1);
        }
        .score-display-card {
          border-radius: 12px;
          padding: 30px 24px;
          text-align: center;
          color: #ffffff;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
        }
        .score-val {
          font-size: 72px;
          font-weight: 800;
          line-height: 1;
          margin: 10px 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .score-level {
          display: inline-block;
          padding: 4px 16px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.25);
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.05em;
          backdrop-filter: blur(4px);
        }
        .item-row {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.2s ease;
        }
        [data-theme="light"] .item-row {
          background: rgba(0, 0, 0, 0.01);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        .item-row:hover {
          transform: translateX(4px);
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
        }
        [data-theme="light"] .item-row:hover {
          background: rgba(0, 0, 0, 0.03);
          border-color: rgba(0, 0, 0, 0.1);
        }
        .item-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .item-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(99, 102, 241, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--brand-primary, #6366f1);
        }
        [data-theme="light"] .item-icon {
          background: rgba(99, 102, 241, 0.08);
        }
        .item-name {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-main, #f8fafc);
        }
        [data-theme="light"] .item-name {
          color: #1e293b;
        }
        .item-desc {
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
          margin-top: 2px;
        }
        .item-scores {
          text-align: right;
        }
        .item-points {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main, #f8fafc);
        }
        [data-theme="light"] .item-points {
          color: #1e293b;
        }
        .item-contrib {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
          margin-top: 2px;
        }
        .advice-card {
          background: rgba(255, 255, 255, 0.02);
          border-left: 4px solid var(--brand-primary, #6366f1);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-left-width: 4px;
          border-left-color: var(--brand-primary, #6366f1);
          border-radius: 0 12px 12px 0;
          padding: 16px;
          margin-top: 20px;
        }
        [data-theme="light"] .advice-card {
          background: rgba(0, 0, 0, 0.01);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-left-width: 4px;
          border-left-color: var(--brand-primary, #6366f1);
        }
        .advice-title {
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-main, #f8fafc);
        }
        [data-theme="light"] .advice-title {
          color: #1e293b;
        }
        .advice-item {
          font-size: 13px;
          color: var(--text-muted, #94a3b8);
          margin-bottom: 8px;
          line-height: 1.5;
        }
        [data-theme="light"] .advice-item {
          color: #475569;
        }
        .advice-item:last-child {
          margin-bottom: 0;
        }
        .input-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .bonus-badge {
          background: rgba(244, 63, 94, 0.15);
          color: #f43f5e;
          font-size: 10px;
          padding: 1px 4px;
          border-radius: 4px;
          margin-left: 4px;
          font-weight: 600;
        }
      `}</style>

      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">计算工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      <div className="workspace workspace--two-column">
        {/* 左侧：输入控制面板 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <span style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>选择性别</span>
            <div className="gender-tabs">
              <button
                type="button"
                className={`tab-btn ${gender === "M" ? "active" : ""}`}
                onClick={() => setGender("M")}
              >
                男生 (Male)
              </button>
              <button
                type="button"
                className={`tab-btn ${gender === "F" ? "active" : ""}`}
                onClick={() => setGender("F")}
              >
                女生 (Female)
              </button>
            </div>
          </div>

          <div>
            <span style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>学段年级</span>
            <div className="grade-tabs">
              <button
                type="button"
                className={`tab-btn ${grade === "1-2" ? "active" : ""}`}
                onClick={() => setGrade("1-2")}
              >
                大一 / 大二
              </button>
              <button
                type="button"
                className={`tab-btn ${grade === "3-4" ? "active" : ""}`}
                onClick={() => setGrade("3-4")}
              >
                大三 / 大四
              </button>
            </div>
          </div>

          <div className="input-grid-2">
            <label className="tool-field">
              <span>身高 (cm)</span>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="例如 175"
                min="100"
                max="250"
              />
            </label>
            <label className="tool-field">
              <span>体重 (kg)</span>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="例如 65"
                min="30"
                max="200"
              />
            </label>
          </div>

          <div className="input-grid-2">
            <label className="tool-field">
              <span>肺活量 (ml)</span>
              <input
                type="number"
                value={vitalCapacity}
                onChange={(e) => setVitalCapacity(e.target.value)}
                placeholder="例如 4200"
              />
            </label>
            <label className="tool-field">
              <span>50米跑 (秒)</span>
              <input
                type="number"
                value={sprint50}
                onChange={(e) => setSprint50(e.target.value)}
                placeholder="例如 7.2"
                step="0.1"
              />
            </label>
          </div>

          <div className="input-grid-2">
            <label className="tool-field">
              <span>立定跳远 (cm)</span>
              <input
                type="number"
                value={standingJump}
                onChange={(e) => setStandingJump(e.target.value)}
                placeholder="例如 240"
              />
            </label>
            <label className="tool-field">
              <span>坐位体前屈 (cm)</span>
              <input
                type="number"
                value={sitAndReach}
                onChange={(e) => setSitAndReach(e.target.value)}
                placeholder="例如 15.5"
                step="0.1"
              />
            </label>
          </div>

          <div className="input-grid-2">
            <div className="tool-field">
              <span>{gender === "M" ? "1000米跑" : "800米跑"}</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="number"
                  value={runMin}
                  onChange={(e) => setRunMin(e.target.value)}
                  placeholder="分"
                  min="0"
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>分</span>
                <input
                  type="number"
                  value={runSec}
                  onChange={(e) => setRunSec(e.target.value)}
                  placeholder="秒"
                  min="0"
                  max="59"
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>秒</span>
              </div>
            </div>
            <label className="tool-field">
              <span>{gender === "M" ? "引体向上 (次)" : "仰卧起坐 (次/分)"}</span>
              <input
                type="number"
                value={strengthReps}
                onChange={(e) => setStrengthReps(e.target.value)}
                placeholder="个数"
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.05)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              清空重置
            </button>
          </div>
        </div>

        {/* 右侧：结果面板与明细分析 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* 总分名片 */}
          <div className="score-display-card" style={{ background: levelInfo.grad }}>
            <span style={{ fontSize: "14px", opacity: 0.9 }}>综合得分 (含加分)</span>
            <div className="score-val">{totalScore}</div>
            <div className="score-level">{levelInfo.label}</div>
          </div>

          {/* 各单项评分细则 */}
          <div style={{ marginBottom: "20px" }}>
            <span style={{ display: "block", fontSize: "15px", fontWeight: 700, marginBottom: "12px", color: "var(--text-main)" }}>
              各项目评分明细
            </span>

            {/* 体重指数 BMI */}
            <div className="item-row">
              <div className="item-info">
                <div className="item-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="20" x="2" y="2" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 7v2" />
                  </svg>
                </div>
                <div>
                  <div className="item-name">体重指数 (BMI)</div>
                  <div className="item-desc">
                    BMI: {bmiVal > 0 ? bmiVal.toFixed(1) : "N/A"} ({bmiInfo.label})
                  </div>
                </div>
              </div>
              <div className="item-scores">
                <div className="item-points">{bmiInfo.score} 分</div>
                <div className="item-contrib">权重 (15%): {(bmiInfo.score * 0.15).toFixed(1)} 分</div>
              </div>
            </div>

            {/* 肺活量 */}
            <div className="item-row">
              <div className="item-info">
                <div className="item-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9.59 4.59A2 2 0 1 1 11 8H2M12.59 19.59A2 2 0 1 0 14 16H2M15.19 12.04A2.5 2.5 0 1 1 17 16H2" />
                  </svg>
                </div>
                <div>
                  <div className="item-name">肺活量</div>
                  <div className="item-desc">
                    {vitalNum > 0 ? `${vitalNum} ml` : "未录入"} ({getItemLevel(vitalScore)})
                  </div>
                </div>
              </div>
              <div className="item-scores">
                <div className="item-points">{vitalScore} 分</div>
                <div className="item-contrib">权重 (15%): {(vitalScore * 0.15).toFixed(1)} 分</div>
              </div>
            </div>

            {/* 50米跑 */}
            <div className="item-row">
              <div className="item-info">
                <div className="item-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="10" x2="14" y1="2" y2="2" />
                    <line x1="12" x2="12" y1="14" y2="11" />
                    <circle cx="12" cy="14" r="8" />
                  </svg>
                </div>
                <div>
                  <div className="item-name">50米跑</div>
                  <div className="item-desc">
                    {sprintNum > 0 ? `${sprintNum} 秒` : "未录入"} ({getItemLevel(sprintScore)})
                  </div>
                </div>
              </div>
              <div className="item-scores">
                <div className="item-points">{sprintScore} 分</div>
                <div className="item-contrib">权重 (20%): {(sprintScore * 0.2).toFixed(1)} 分</div>
              </div>
            </div>

            {/* 立定跳远 */}
            <div className="item-row">
              <div className="item-info">
                <div className="item-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m3 16 4-4 4 4" />
                    <path d="m13 10 4-4 4 4" />
                    <path d="M7 12V21" />
                    <path d="M17 6V15" />
                  </svg>
                </div>
                <div>
                  <div className="item-name">立定跳远</div>
                  <div className="item-desc">
                    {jumpNum > 0 ? `${jumpNum} cm` : "未录入"} ({getItemLevel(jumpScore)})
                  </div>
                </div>
              </div>
              <div className="item-scores">
                <div className="item-points">{jumpScore} 分</div>
                <div className="item-contrib">权重 (10%): {(jumpScore * 0.1).toFixed(1)} 分</div>
              </div>
            </div>

            {/* 坐位体前屈 */}
            <div className="item-row">
              <div className="item-info">
                <div className="item-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m15 5-5 5 5 5" />
                    <path d="m9 5-5 5 5 5" />
                    <path d="M10 10h10" />
                  </svg>
                </div>
                <div>
                  <div className="item-name">坐位体前屈</div>
                  <div className="item-desc">
                    {reachNum !== 0 ? `${reachNum} cm` : "未录入"} ({getItemLevel(reachScore)})
                  </div>
                </div>
              </div>
              <div className="item-scores">
                <div className="item-points">{reachScore} 分</div>
                <div className="item-contrib">权重 (10%): {(reachScore * 0.1).toFixed(1)} 分</div>
              </div>
            </div>

            {/* 中长跑 */}
            <div className="item-row">
              <div className="item-info">
                <div className="item-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                </div>
                <div>
                  <div className="item-name">{gender === "M" ? "1000米跑" : "800米跑"}</div>
                  <div className="item-desc">
                    {runTotalSeconds > 0 ? `${rMinNum}分${rSecNum}秒` : "未录入"} ({getItemLevel(runScore)})
                  </div>
                </div>
              </div>
              <div className="item-scores">
                <div className="item-points">
                  {runScore} 分
                  {runBonus > 0 && <span className="bonus-badge">加 {runBonus} 分</span>}
                </div>
                <div className="item-contrib">权重 (20%): {(runScore * 0.2).toFixed(1)} 分</div>
              </div>
            </div>

            {/* 引体向上 / 仰卧起坐 */}
            <div className="item-row">
              <div className="item-info">
                <div className="item-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6.5 6.5 11 11" />
                    <path d="m18 22 4-4" />
                    <path d="m2 6 4-4" />
                    <path d="m3 10 7-7" />
                    <path d="m14 21 7-7" />
                  </svg>
                </div>
                <div>
                  <div className="item-name">{gender === "M" ? "引体向上" : "一分钟仰卧起坐"}</div>
                  <div className="item-desc">
                    {strengthNum > 0 ? `${strengthNum} 次` : "未录入"} ({getItemLevel(strengthScore)})
                  </div>
                </div>
              </div>
              <div className="item-scores">
                <div className="item-points">
                  {strengthScore} 分
                  {strengthBonus > 0 && <span className="bonus-badge">加 {strengthBonus} 分</span>}
                </div>
                <div className="item-contrib">权重 (10%): {(strengthScore * 0.1).toFixed(1)} 分</div>
              </div>
            </div>
          </div>

          {/* 评估建议报告 */}
          <div className="advice-card">
            <div className="advice-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              体质状况评估与运动建议
            </div>
            {advices.length > 0 ? (
              advices.map((advice, index) => (
                <div key={index} className="advice-item">{advice}</div>
              ))
            ) : (
              <div className="advice-item" style={{ color: "#10b981", fontWeight: 500 }}>
                您的所有项目成绩都很均衡健康！请继续保持良好的锻炼习惯，加强心肺和肌肉力量的综合维护。
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
