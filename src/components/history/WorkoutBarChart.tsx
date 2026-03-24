import { useState, useMemo, useEffect, useRef } from "react";
import type { WorkoutSession } from "../../types/models";

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const CHART_HEIGHT = 112; // px

type View = "months" | "weeks";

interface Props {
  sessions: WorkoutSession[];
}

export function WorkoutBarChart({ sessions }: Props) {
  const [tooltip, setTooltip] = useState<number | null>(null);
  const [view, setView] = useState<View>("months");
  const [animKey, setAnimKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Monthly data
  const { monthlyCounts, monthlyTotal } = useMemo(() => {
    const counts = new Array(12).fill(0);
    for (const session of sessions) {
      const d = new Date(session.startedAt);
      if (d.getFullYear() === currentYear) counts[d.getMonth()]++;
    }
    return { monthlyCounts: counts, monthlyTotal: counts.reduce((a, b) => a + b, 0) };
  }, [sessions, currentYear]);

  // Weekly data — rolling 12 weeks
  const { weeklyCounts, weekLabels, weeklyTotal } = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

    const weeks: { start: Date; end: Date }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(monday);
      start.setDate(monday.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      weeks.push({ start, end });
    }

    const counts = weeks.map(({ start, end }) =>
      sessions.filter((s) => {
        const d = new Date(s.startedAt);
        return d >= start && d < end;
      }).length
    );

    const labels = weeks.map(({ start }) => `${start.getDate()}/${start.getMonth() + 1}`);
    const total = counts.reduce((a, b) => a + b, 0);
    return { weeklyCounts: counts, weekLabels: labels, weeklyTotal: total };
  }, [sessions]);

  const counts = view === "months" ? monthlyCounts : weeklyCounts;
  const labels = view === "months" ? MONTH_LABELS : weekLabels;
  const total = view === "months" ? monthlyTotal : weeklyTotal;
  const maxCount = Math.max(...counts, 1);

  const handleViewChange = (newView: View) => {
    if (newView === view) return;
    setTooltip(null);
    setView(newView);
    setAnimKey((k) => k + 1);
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTooltip(null);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  return (
    <div ref={containerRef}>
      <div className="rounded-card border border-black/10 dark:border-white/10 px-4 pt-4 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-[13px] font-medium opacity-50">
            {view === "months" ? currentYear : "12 veckor"}
          </span>

          {/* Segmented toggle */}
          <div className="flex rounded-full bg-black/[0.06] dark:bg-white/10 p-[3px]">
            {(["months", "weeks"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => handleViewChange(v)}
                className="px-3 py-[3px] rounded-full text-[11px] font-bold tracking-wide transition-all duration-200"
                style={{
                  background: view === v ? "#FFD900" : "transparent",
                  color: view === v ? "#000" : undefined,
                  opacity: view === v ? 1 : 0.4,
                }}
              >
                {v === "months" ? "MÅN" : "VEC"}
              </button>
            ))}
          </div>

          <span className="text-[13px] font-bold tracking-wide">TOTALT {total}</span>
        </div>

        {/* Bars */}
        <div key={animKey} className="flex items-end gap-[5px]" style={{ height: CHART_HEIGHT }}>
          {counts.map((count, i) => {
            const isCurrent = view === "months" ? i === currentMonth : i === 11;
            const heightPct = count > 0 ? Math.max((count / maxCount) * 100, 6) : 0;
            const isSelected = tooltip === i;

            return (
              <div
                key={i}
                className="relative flex-1 flex flex-col justify-end h-full cursor-pointer"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setTooltip(isSelected ? null : i);
                }}
              >
                {/* Tooltip */}
                {isSelected && (
                  <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-10
                    bg-black dark:bg-white text-white dark:text-black
                    text-[11px] font-semibold px-[7px] py-[3px] rounded-lg whitespace-nowrap
                    shadow-sm pointer-events-none">
                    {count} pass
                    <div className="absolute top-full left-1/2 -translate-x-1/2
                      border-4 border-transparent border-t-black dark:border-t-white" />
                  </div>
                )}

                {/* Bar */}
                {count > 0 ? (
                  <div
                    className="rounded-t-[3px] w-full transition-opacity duration-150"
                    style={{
                      height: `${heightPct}%`,
                      background: isCurrent ? "#FFD900" : "rgba(128,128,128,0.55)",
                      opacity: isSelected ? 0.75 : 1,
                    }}
                  />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Labels — outside the card */}
      <div key={`labels-${animKey}`} className="flex gap-[5px] mt-2 px-4">
        {labels.map((label, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[11px]"
            style={{
              opacity: view === "months"
                ? (i <= currentMonth ? 0.5 : 0.25)
                : (i === 11 ? 0.7 : 0.4),
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
