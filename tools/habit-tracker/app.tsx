"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

const habitNames = ["Read", "Exercise", "Ship one task"];
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function initialGrid() {
  return habitNames.map((name, habitIndex) => ({
    name,
    days: weekDays.map((_, dayIndex) => habitIndex === 0 ? dayIndex !== 5 : habitIndex === 1 ? dayIndex % 2 === 0 : dayIndex < 5)
  }));
}

function bestStreak(days: boolean[]) {
  let best = 0;
  let current = 0;
  for (const done of days) {
    current = done ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

export default function HabitTrackerTool({ manifest }: ToolAppProps) {
  const [habits, setHabits] = useState(initialGrid);
  const [newHabit, setNewHabit] = useState("");
  const [copied, setCopied] = useState(false);
  const totalSlots = habits.length * weekDays.length;
  const doneSlots = habits.reduce((sum, habit) => sum + habit.days.filter(Boolean).length, 0);
  const completion = totalSlots ? Math.round((doneSlots / totalSlots) * 100) : 0;
  const report = useMemo(() => habits.map((habit) => habit.name + ": " + habit.days.map((done, index) => done ? weekDays[index] : "--").join(" ")).join("\n"), [habits]);

  function toggle(habitIndex: number, dayIndex: number) {
    setHabits((current) => current.map((habit, index) => index === habitIndex ? { ...habit, days: habit.days.map((done, dIndex) => dIndex === dayIndex ? !done : done) } : habit));
    setCopied(false);
  }

  function addHabit() {
    const name = newHabit.trim();
    if (!name) return;
    setHabits((current) => [...current, { name, days: weekDays.map(() => false) }]);
    setNewHabit("");
  }

  async function copyReport() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Productivity</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar"><label className="tool-field tool-field--compact"><span>New habit</span><input value={newHabit} onChange={(event) => setNewHabit(event.target.value)} /></label><button type="button" onClick={addHabit}>Add habit</button><button type="button" onClick={() => void copyReport()}>{copied ? "Copied" : "Copy report"}</button></div>
      <div className="detail-grid"><article className="detail-card"><h3>Completion</h3><p>{completion}%</p></article><article className="detail-card"><h3>Done</h3><p>{doneSlots}/{totalSlots}</p></article><article className="detail-card"><h3>Habits</h3><p>{habits.length}</p></article></div>
      <div className="detail-card" style={{ overflowX: "auto" }}>
        <h3>Weekly tracker</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={{ textAlign: "left", padding: 8 }}>Habit</th>{weekDays.map((day) => <th style={{ padding: 8 }} key={day}>{day}</th>)}<th style={{ padding: 8 }}>Streak</th></tr></thead>
          <tbody>{habits.map((habit, habitIndex) => <tr key={habit.name}><td style={{ padding: 8 }}>{habit.name}</td>{habit.days.map((done, dayIndex) => <td style={{ padding: 8, textAlign: "center" }} key={weekDays[dayIndex]}><button type="button" onClick={() => toggle(habitIndex, dayIndex)} className={done ? "button--primary" : ""} aria-label={habit.name + " " + weekDays[dayIndex]}>{done ? "Done" : "Open"}</button></td>)}<td style={{ padding: 8, textAlign: "center" }}>{bestStreak(habit.days)}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
