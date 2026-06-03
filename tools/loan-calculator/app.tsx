"use client";

import { useState, useMemo } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";

// Common rates and terms presets
const TERM_PRESETS = [
  { label: "30年 (360期)", value: 30 },
  { label: "25年 (300期)", value: 25 },
  { label: "20年 (240期)", value: 20 },
  { label: "15年 (180期)", value: 15 },
  { label: "10年 (120期)", value: 10 },
  { label: "5年 (60期)", value: 5 }
];

const COMMERCIAL_RATE_PRESETS = [
  { label: "最新LPR (3.45%)", value: 3.45 },
  { label: "LPR+30BP (3.75%)", value: 3.75 },
  { label: "优惠利率 (3.15%)", value: 3.15 },
  { label: "基准利率 (4.90%)", value: 4.90 }
];

const FUND_RATE_PRESETS = [
  { label: "首套公积金 (2.85%)", value: 2.85 },
  { label: "二套公积金 (3.325%)", value: 3.325 }
];

interface ScheduleItem {
  month: number;
  yearNum: number;
  monthNum: number;
  payment: number;
  principal: number;
  interest: number;
  remainingPrincipal: number;
}

interface LoanSummary {
  totalPayment: number;
  totalInterest: number;
  monthlyPaymentStr: string;
  firstMonthPayment?: number;
  decreasePerMonth?: number;
  schedule: ScheduleItem[];
}

// Repayment calculation helpers
function calculateSingleLoan(
  amountWan: number,
  termYears: number,
  annualRatePercent: number,
  method: "interest" | "principal"
): LoanSummary {
  const principalAmount = amountWan * 10000;
  const totalMonths = termYears * 12;
  const monthlyRate = annualRatePercent / 12 / 100;
  const schedule: ScheduleItem[] = [];

  if (principalAmount <= 0 || totalMonths <= 0) {
    return { totalPayment: 0, totalInterest: 0, monthlyPaymentStr: "0.00", schedule: [] };
  }

  let totalPayment = 0;
  let totalInterest = 0;

  if (method === "interest") {
    // 等额本息 (Equal Principal & Interest)
    // Formula: P = A * [R * (1 + R)^N] / [(1 + R)^N - 1]
    let monthlyPayment = 0;
    if (monthlyRate === 0) {
      monthlyPayment = principalAmount / totalMonths;
    } else {
      monthlyPayment =
        (principalAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1);
    }

    let remaining = principalAmount;
    for (let m = 1; m <= totalMonths; m++) {
      const interestPaid = remaining * monthlyRate;
      const principalPaid = monthlyPayment - interestPaid;
      remaining -= principalPaid;

      // Adjust rounding error in last month
      const adjustedRemaining = m === totalMonths ? 0 : Math.max(0, remaining);
      const finalPrincipalPaid = m === totalMonths ? remaining + principalPaid : principalPaid;
      const finalPayment = m === totalMonths ? finalPrincipalPaid + interestPaid : monthlyPayment;

      schedule.push({
        month: m,
        yearNum: Math.ceil(m / 12),
        monthNum: m % 12 === 0 ? 12 : m % 12,
        payment: finalPayment,
        principal: finalPrincipalPaid,
        interest: interestPaid,
        remainingPrincipal: adjustedRemaining
      });

      totalPayment += finalPayment;
      totalInterest += interestPaid;
    }

    return {
      totalPayment,
      totalInterest,
      monthlyPaymentStr: monthlyPayment.toFixed(2),
      schedule
    };
  } else {
    // 等额本金 (Equal Principal)
    const monthlyPrincipal = principalAmount / totalMonths;
    let remaining = principalAmount;

    for (let m = 1; m <= totalMonths; m++) {
      const interestPaid = remaining * monthlyRate;
      const payment = monthlyPrincipal + interestPaid;
      remaining -= monthlyPrincipal;

      schedule.push({
        month: m,
        yearNum: Math.ceil(m / 12),
        monthNum: m % 12 === 0 ? 12 : m % 12,
        payment,
        principal: monthlyPrincipal,
        interest: interestPaid,
        remainingPrincipal: Math.max(0, remaining)
      });

      totalPayment += payment;
      totalInterest += interestPaid;
    }

    const firstMonth = schedule[0]?.payment || 0;
    const secondMonth = schedule[1]?.payment || 0;
    const decrease = firstMonth - secondMonth;

    return {
      totalPayment,
      totalInterest,
      monthlyPaymentStr: `${firstMonth.toFixed(2)} ➔ ${schedule[schedule.length - 1]?.payment.toFixed(2)}`,
      firstMonthPayment: firstMonth,
      decreasePerMonth: decrease,
      schedule
    };
  }
}

// Calculate combined loans (Commercial + Provident Fund)
function calculateCombinedLoan(
  commercialWan: number,
  commercialRate: number,
  fundWan: number,
  fundRate: number,
  termYears: number,
  method: "interest" | "principal"
): LoanSummary {
  const commSummary = calculateSingleLoan(commercialWan, termYears, commercialRate, method);
  const fundSummary = calculateSingleLoan(fundWan, termYears, fundRate, method);

  const totalMonths = termYears * 12;
  const schedule: ScheduleItem[] = [];

  for (let m = 1; m <= totalMonths; m++) {
    const cItem = commSummary.schedule[m - 1];
    const fItem = fundSummary.schedule[m - 1];

    schedule.push({
      month: m,
      yearNum: Math.ceil(m / 12),
      monthNum: m % 12 === 0 ? 12 : m % 12,
      payment: (cItem?.payment || 0) + (fItem?.payment || 0),
      principal: (cItem?.principal || 0) + (fItem?.principal || 0),
      interest: (cItem?.interest || 0) + (fItem?.interest || 0),
      remainingPrincipal: (cItem?.remainingPrincipal || 0) + (fItem?.remainingPrincipal || 0)
    });
  }

  const totalPayment = commSummary.totalPayment + fundSummary.totalPayment;
  const totalInterest = commSummary.totalInterest + fundSummary.totalInterest;

  if (method === "interest") {
    const combinedMonthly =
      parseFloat(commSummary.monthlyPaymentStr) + parseFloat(fundSummary.monthlyPaymentStr);
    return {
      totalPayment,
      totalInterest,
      monthlyPaymentStr: combinedMonthly.toFixed(2),
      schedule
    };
  } else {
    const firstMonth = (commSummary.firstMonthPayment || 0) + (fundSummary.firstMonthPayment || 0);
    const lastMonth = schedule[schedule.length - 1]?.payment || 0;
    const decrease = (commSummary.decreasePerMonth || 0) + (fundSummary.decreasePerMonth || 0);

    return {
      totalPayment,
      totalInterest,
      monthlyPaymentStr: `${firstMonth.toFixed(2)} ➔ ${lastMonth.toFixed(2)}`,
      firstMonthPayment: firstMonth,
      decreasePerMonth: decrease,
      schedule
    };
  }
}

export default function LoanCalculatorTool({ manifest }: ToolAppProps) {
  // Tabs: "single" (Commercial / Provident Fund alone) or "combined" (Commercial + PF)
  const [activeTab, setActiveTab] = useState<"single" | "combined">("single");

  // Single Loan parameters
  const [calcMode, setCalcMode] = useState<"amount" | "housePrice">("amount");
  const [housePrice, setHousePrice] = useState(150); // in 万元
  const [downPaymentRatio, setDownPaymentRatio] = useState(30); // in %
  const [loanAmount, setLoanAmount] = useState(100); // in 万元
  const [loanTerm, setLoanTerm] = useState(30); // in years
  const [interestRate, setInterestRate] = useState(3.45); // Annual Rate %
  const [loanType, setLoanType] = useState<"commercial" | "fund">("commercial");

  const computedLoanAmount = useMemo(() => {
    if (activeTab === "single" && calcMode === "housePrice") {
      return Math.max(0, housePrice * (1 - downPaymentRatio / 100));
    }
    return loanAmount;
  }, [activeTab, calcMode, housePrice, downPaymentRatio, loanAmount]);

  // Combined Loan parameters
  const [commAmount, setCommAmount] = useState(80);
  const [commRate, setCommRate] = useState(3.45);
  const [fundAmount, setFundAmount] = useState(40);
  const [fundRate, setFundRate] = useState(2.85);
  const [combinedTerm, setCombinedTerm] = useState(30);

  // Repayment method: "interest" (等额本息) or "principal" (等额本金)
  const [repaymentMethod, setRepaymentMethod] = useState<"interest" | "principal">("interest");

  // Pagination for amortization table
  const [currentPage, setCurrentPage] = useState(1);
  const [scheduleFilterYear, setScheduleFilterYear] = useState<number | "all">("all");
  const itemsPerPage = 12;

  // Repayment summaries
  const result = useMemo(() => {
    if (activeTab === "single") {
      return calculateSingleLoan(computedLoanAmount, loanTerm, interestRate, repaymentMethod);
    } else {
      return calculateCombinedLoan(
        commAmount,
        commRate,
        fundAmount,
        fundRate,
        combinedTerm,
        repaymentMethod
      );
    }
  }, [
    activeTab,
    computedLoanAmount,
    loanTerm,
    interestRate,
    repaymentMethod,
    commAmount,
    commRate,
    fundAmount,
    fundRate,
    combinedTerm
  ]);

  const totalPrincipal = useMemo(() => {
    if (activeTab === "single") {
      return computedLoanAmount * 10000;
    } else {
      return (commAmount + fundAmount) * 10000;
    }
  }, [activeTab, computedLoanAmount, commAmount, fundAmount]);

  // Available year options for filtering schedule
  const yearsList = useMemo(() => {
    const totalM = result.schedule.length;
    const years = Math.ceil(totalM / 12);
    const arr = [];
    for (let i = 1; i <= years; i++) {
      arr.push(i);
    }
    return arr;
  }, [result.schedule]);

  // Filtered schedule
  const filteredSchedule = useMemo(() => {
    if (scheduleFilterYear === "all") {
      return result.schedule;
    }
    return result.schedule.filter((item) => item.yearNum === scheduleFilterYear);
  }, [result.schedule, scheduleFilterYear]);

  // Total pages
  const totalPages = Math.ceil(filteredSchedule.length / itemsPerPage);

  // Paginated schedule items
  const paginatedSchedule = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSchedule.slice(start, start + itemsPerPage);
  }, [filteredSchedule, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleFilterYearChange = (val: string) => {
    if (val === "all") {
      setScheduleFilterYear("all");
    } else {
      setScheduleFilterYear(Number(val));
    }
    setCurrentPage(1);
  };

  // Helper to format currency
  const formatRMB = (val: number) => {
    return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(val);
  };

  const formatWan = (val: number) => {
    return (val / 10000).toFixed(2) + " 万元";
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">金融与计算</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>

      {/* Tabs */}
      <div className="tab-container" style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => { setActiveTab("single"); setCurrentPage(1); }}
          style={{
            padding: "0.75rem 1.2rem",
            fontSize: "0.95rem",
            fontWeight: activeTab === "single" ? 600 : 400,
            color: activeTab === "single" ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: activeTab === "single" ? "2px solid var(--accent)" : "2px solid transparent",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer"
          }}
        >
          🏦 商业贷/公积金贷款
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab("combined"); setCurrentPage(1); }}
          style={{
            padding: "0.75rem 1.2rem",
            fontSize: "0.95rem",
            fontWeight: activeTab === "combined" ? 600 : 400,
            color: activeTab === "combined" ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: activeTab === "combined" ? "2px solid var(--accent)" : "2px solid transparent",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer"
          }}
        >
          🧩 组合贷款 (商业+公积金)
        </button>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
        {/* Left Column - Input Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div className="detail-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              ⚙️ 贷款参数设置
            </h3>

            {/* Repayment Method Select */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>还款方式</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setRepaymentMethod("interest")}
                  className={repaymentMethod === "interest" ? "button--primary" : "button--secondary"}
                  style={{ flex: 1, padding: "0.5rem" }}
                >
                  等额本息 (每月还款相同)
                </button>
                <button
                  type="button"
                  onClick={() => setRepaymentMethod("principal")}
                  className={repaymentMethod === "principal" ? "button--primary" : "button--secondary"}
                  style={{ flex: 1, padding: "0.5rem" }}
                >
                  等额本金 (首月多/逐月递减)
                </button>
              </div>
            </div>

            {/* Conditional Fields based on active tab */}
            {activeTab === "single" ? (
              <>
                {/* 计算方式 Switch */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>计算方式</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => setCalcMode("amount")}
                      className={calcMode === "amount" ? "button--primary" : "button--secondary"}
                      style={{ flex: 1, padding: "0.4rem", fontSize: "0.85rem" }}
                    >
                      按贷款额度
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcMode("housePrice")}
                      className={calcMode === "housePrice" ? "button--primary" : "button--secondary"}
                      style={{ flex: 1, padding: "0.4rem", fontSize: "0.85rem" }}
                    >
                      按房屋总价
                    </button>
                  </div>
                </div>

                {/* Loan Type Select */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>贷款类型</label>
                  <select
                    value={loanType}
                    onChange={(e) => {
                      const val = e.target.value as "commercial" | "fund";
                      setLoanType(val);
                      setInterestRate(val === "commercial" ? 3.45 : 2.85);
                    }}
                    className="tool-field"
                    style={{ padding: "0.5rem", borderRadius: "6px" }}
                  >
                    <option value="commercial">商业贷款 (Commercial Loan)</option>
                    <option value="fund">住房公积金贷款 (Provident Fund Loan)</option>
                  </select>
                </div>

                {calcMode === "housePrice" ? (
                  <>
                    {/* 房屋总价 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        <span>房屋总价 (万元)</span>
                        <span style={{ color: "var(--accent)" }}>{formatRMB(housePrice * 10000)}</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10000}
                        step={5}
                        value={housePrice}
                        onChange={(e) => setHousePrice(Math.max(0, Number(e.target.value)))}
                        className="tool-field"
                        style={{ padding: "0.5rem", borderRadius: "6px" }}
                      />
                      <input
                        type="range"
                        min={10}
                        max={3000}
                        step={10}
                        value={housePrice}
                        onChange={(e) => setHousePrice(Number(e.target.value))}
                        style={{ cursor: "pointer", accentColor: "var(--accent)" }}
                      />
                    </div>

                    {/* 首付比例 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        <span>首付比例 ({downPaymentRatio}%)</span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                          首付款: {formatWan(housePrice * (downPaymentRatio / 100) * 10000)}
                        </span>
                      </label>
                      <select
                        value={downPaymentRatio}
                        onChange={(e) => setDownPaymentRatio(Number(e.target.value))}
                        className="tool-field"
                        style={{ padding: "0.5rem", borderRadius: "6px" }}
                      >
                        <option value={15}>1.5成首付 (15%)</option>
                        <option value={20}>2成首付 (20%)</option>
                        <option value={30}>3成首付 (30%)</option>
                        <option value={40}>4成首付 (40%)</option>
                        <option value={50}>5成首付 (50%)</option>
                        <option value={60}>6成首付 (60%)</option>
                        <option value={70}>7成首付 (70%)</option>
                        <option value={80}>8成首付 (80%)</option>
                      </select>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "-0.2rem" }}>
                        贷款总额: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{computedLoanAmount.toFixed(2)} 万元</span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Amount */
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <span>贷款总额 (万元)</span>
                      <span style={{ color: "var(--accent)" }}>{formatRMB(loanAmount * 10000)}</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      step={1}
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Math.max(0, Number(e.target.value)))}
                      className="tool-field"
                      style={{ padding: "0.5rem", borderRadius: "6px" }}
                    />
                    <input
                      type="range"
                      min={5}
                      max={2000}
                      step={5}
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      style={{ cursor: "pointer", accentColor: "var(--accent)" }}
                    />
                  </div>
                )}

                {/* Term */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>贷款期限</label>
                  <select
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(Number(e.target.value))}
                    className="tool-field"
                    style={{ padding: "0.5rem", borderRadius: "6px" }}
                  >
                    {TERM_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {/* Interest Rate */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>年利率 (%)</label>
                  <input
                    type="number"
                    step={0.01}
                    min={0.1}
                    max={25}
                    value={interestRate}
                    onChange={(e) => setInterestRate(Math.max(0, Number(e.target.value)))}
                    className="tool-field"
                    style={{ padding: "0.5rem", borderRadius: "6px" }}
                  />
                  {/* Preset Rates */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.2rem" }}>
                    {(loanType === "commercial" ? COMMERCIAL_RATE_PRESETS : FUND_RATE_PRESETS).map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setInterestRate(preset.value)}
                        className="button--secondary"
                        style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }}
                      >
                        {preset.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Commercial loan inputs */}
                <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "0.8rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  <h4 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-primary)" }}>🏢 商业贷款部分</h4>
                  
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>金额 (万元)</label>
                      <input
                        type="number"
                        min={0}
                        value={commAmount}
                        onChange={(e) => setCommAmount(Math.max(0, Number(e.target.value)))}
                        className="tool-field"
                        style={{ padding: "0.4rem", borderRadius: "6px" }}
                      />
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>利率 (%)</label>
                      <input
                        type="number"
                        step={0.01}
                        value={commRate}
                        onChange={(e) => setCommRate(Math.max(0, Number(e.target.value)))}
                        className="tool-field"
                        style={{ padding: "0.4rem", borderRadius: "6px" }}
                      />
                    </div>
                  </div>
                </div>

                {/* PF loan inputs */}
                <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "0.8rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  <h4 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-primary)" }}>🏡 公积金贷款部分</h4>
                  
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>金额 (万元)</label>
                      <input
                        type="number"
                        min={0}
                        value={fundAmount}
                        onChange={(e) => setFundAmount(Math.max(0, Number(e.target.value)))}
                        className="tool-field"
                        style={{ padding: "0.4rem", borderRadius: "6px" }}
                      />
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>利率 (%)</label>
                      <input
                        type="number"
                        step={0.01}
                        value={fundRate}
                        onChange={(e) => setFundRate(Math.max(0, Number(e.target.value)))}
                        className="tool-field"
                        style={{ padding: "0.4rem", borderRadius: "6px" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Term for Combined Loan */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>贷款期限</label>
                  <select
                    value={combinedTerm}
                    onChange={(e) => setCombinedTerm(Number(e.target.value))}
                    className="tool-field"
                    style={{ padding: "0.5rem", borderRadius: "6px" }}
                  >
                    {TERM_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Results and Metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {/* House Purchase Summary (shown when calcMode === "housePrice") */}
          {activeTab === "single" && calcMode === "housePrice" && (
            <div 
              className="detail-card" 
              style={{ 
                padding: "1rem", 
                background: "linear-gradient(135deg, var(--bg-card), var(--bg-muted))", 
                border: "1px solid var(--border)",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
                textAlign: "center"
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>房屋总价</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                  {housePrice.toFixed(2)} 万元
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>首付金额 ({downPaymentRatio}%)</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                  {(housePrice * (downPaymentRatio / 100)).toFixed(2)} 万元
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>贷款金额</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--accent)", marginTop: "0.15rem" }}>
                  {computedLoanAmount.toFixed(2)} 万元
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div 
            style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr", 
              gap: "1rem" 
            }}
          >
            <div className="detail-card" style={{ padding: "1rem", textAlign: "left" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {repaymentMethod === "interest" ? "每月月供" : "首月月供"}
              </span>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--accent)", marginTop: "0.25rem" }}>
                {repaymentMethod === "interest" ? formatRMB(parseFloat(result.monthlyPaymentStr)) : formatRMB(result.firstMonthPayment || 0)}
              </div>
              {repaymentMethod === "principal" && result.decreasePerMonth && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
                  每月递减: {formatRMB(result.decreasePerMonth)}
                </div>
              )}
            </div>

            <div className="detail-card" style={{ padding: "1rem", textAlign: "left" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>累计支付利息</span>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
                {formatRMB(result.totalInterest)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
                约合: {formatWan(result.totalInterest)}
              </div>
            </div>

            <div className="detail-card" style={{ padding: "1rem", textAlign: "left" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>累计还款总额</span>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
                {formatRMB(result.totalPayment)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
                约合: {formatWan(result.totalPayment)}
              </div>
            </div>

            <div className="detail-card" style={{ padding: "1rem", textAlign: "left" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>贷款本金总额</span>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
                {formatRMB(totalPrincipal)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
                占比: {((totalPrincipal / (result.totalPayment || 1)) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Visual Amortization Progress Bar */}
          {result.totalPayment > 0 && (
            <div className="detail-card" style={{ padding: "1.2rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span style={{ fontWeight: 500 }}>还款结构比例</span>
                <span style={{ color: "var(--text-secondary)" }}>
                  利息和本金比例
                </span>
              </div>
              
              {/* Progress bar representing ratio */}
              <div style={{ height: "24px", width: "100%", background: "var(--border)", borderRadius: "12px", overflow: "hidden", display: "flex" }}>
                <div 
                  style={{
                    width: `${(totalPrincipal / result.totalPayment) * 100}%`,
                    background: "var(--accent)",
                    color: "#fff",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600
                  }}
                  title={`本金占比: ${((totalPrincipal / result.totalPayment) * 100).toFixed(1)}%`}
                >
                  本金 {((totalPrincipal / result.totalPayment) * 100).toFixed(0)}%
                </div>
                <div 
                  style={{
                    width: `${(result.totalInterest / result.totalPayment) * 100}%`,
                    background: "orange",
                    color: "#fff",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600
                  }}
                  title={`利息占比: ${((result.totalInterest / result.totalPayment) * 100).toFixed(1)}%`}
                >
                  利息 {((result.totalInterest / result.totalPayment) * 100).toFixed(0)}%
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.2rem" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ width: "8px", height: "8px", background: "var(--accent)", borderRadius: "50%" }}></span>
                  本金: {formatRMB(totalPrincipal)}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ width: "8px", height: "8px", background: "orange", borderRadius: "50%" }}></span>
                  利息: {formatRMB(result.totalInterest)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Amortization Schedule Table */}
      {result.schedule.length > 0 && (
        <div className="detail-card" style={{ marginTop: "2rem", padding: "1.25rem" }}>
          <div 
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.8rem",
              marginBottom: "1rem" 
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              📅 还款计划明细表
            </h3>

            {/* Filter controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>筛选年份:</span>
              <select
                value={scheduleFilterYear}
                onChange={(e) => handleFilterYearChange(e.target.value)}
                className="tool-field"
                style={{ padding: "0.3rem 0.5rem", borderRadius: "4px", fontSize: "0.85rem" }}
              >
                <option value="all">查看全部 ({result.schedule.length}期)</option>
                {yearsList.map((y) => (
                  <option key={y} value={y}>第 {y} 年</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "0.75rem 0.5rem" }}>期数</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>年份</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>每月月供</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>应还本金</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>应还利息</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>剩余本金</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSchedule.map((item) => (
                  <tr 
                    key={item.month} 
                    style={{ 
                      borderBottom: "1px solid var(--border)",
                      background: item.monthNum === 12 ? "var(--bg-muted)" : "none"
                    }}
                  >
                    <td style={{ padding: "0.6rem 0.5rem", fontWeight: 500 }}>第 {item.month} 期</td>
                    <td style={{ padding: "0.6rem 0.5rem", color: "var(--text-secondary)" }}>
                      第 {item.yearNum} 年 (第{item.monthNum}月)
                    </td>
                    <td style={{ padding: "0.6rem 0.5rem", color: "var(--accent)", fontWeight: 500 }}>
                      {formatRMB(item.payment)}
                    </td>
                    <td style={{ padding: "0.6rem 0.5rem" }}>{formatRMB(item.principal)}</td>
                    <td style={{ padding: "0.6rem 0.5rem", color: "orange" }}>{formatRMB(item.interest)}</td>
                    <td style={{ padding: "0.6rem 0.5rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                      {formatRMB(item.remainingPrincipal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div 
              style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                marginTop: "1rem",
                fontSize: "0.85rem",
                color: "var(--text-secondary)"
              }}
            >
              <span>
                显示 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredSchedule.length)} 条记录，共 {filteredSchedule.length} 条
              </span>

              <div style={{ display: "flex", gap: "0.3rem" }}>
                <button
                  type="button"
                  className="button--secondary"
                  style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ◀ 上一页
                </button>
                
                <span style={{ display: "flex", alignItems: "center", padding: "0 0.5rem" }}>
                  {currentPage} / {totalPages} 页
                </span>

                <button
                  type="button"
                  className="button--secondary"
                  style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  下一页 ▶
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="tool-note" style={{ marginTop: "1.5rem" }}>
        💡 <b>科普常识：</b>
        <ul style={{ margin: "0.4rem 0 0 1rem", padding: 0 }}>
          <li><b>等额本息：</b>把按揭贷款的本金总额与利息总额相加，然后平均分摊到还款期限的每个月中。每个月还款额相同，前期利息占比较多，本金较少，适合每月收入稳定的群体。</li>
          <li><b>等额本金：</b>将本金分摊到每个月，同时付清上一交易日至本次还款日之间的利息。前期月供高，后面随着本金减少利息变少，每月还款额逐月递减，利息总开支比等额本息少，适合前期还款能力较强的群体。</li>
        </ul>
      </div>
    </section>
  );
}
