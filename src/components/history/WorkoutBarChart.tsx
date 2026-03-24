import { useState, useMemo, useEffect, useRef } from "react";
import type { WorkoutSession } from "../../types/models";

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const CHART_HEIGHT = 112; // px
const BTN_WIDTH = 62; // px — fixed width so toggle never shifts layout

type View = "months" | "weeks";

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

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

  // Weekly data — all ISO weeks of current year
  const { weeklyCounts, weekLabels, weeklyTotal, currentWeekIndex } = useMemo(() => {
    // Find Monday of ISO week 1
    const jan4 = new Date(currentYear, 0, 4);
    const dow = jan4.getDay() || 7;
    const week1Monday = new Date(jan4);
    week1Monday.setDate(jan4.getDate() - dow + 1);
    week1Monday.setHours(0, 0, 0, 0);

    // Total ISO weeks in year
    const dec28 = new Date(currentYear, 11, 28);
    const totalWeeks = getISOWeek(dec28);

    const weeks: { start: Date; end: Date }[] = [];
    for (let i = 0; i < totalWeeks; i++) {
      const start = new Date(week1Monday);
      start.setDate(week1Monday.getDate() + i * 7);
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

    const labels = weeks.map((_, i) => String(i + 1));
    const total = counts.reduce((a, b) => a + b, 0);
    const todayMs = Date.now();
    const cwIndex = weeks.findIndex(({ start, end }) => todayMs >= start.getTime() && todayMs < end.getTime());

    return { weeklyCounts: counts, weekLabels: labels, weeklyTotal: total, currentWeekIndex: cwIndex };
  }, [sessions, currentYear]);

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
          <span className="text-[13px] font-medium opacity-50">{currentYear}</span>

          {/* Segmented pill toggle */}
          <div
            className="relative flex rounded-full p-[6px]"
            style={{ border: "1px solid rgba(0,0,0,0.1)" }}
          >
            {/* Sliding indicator */}
            <div
              className="absolute top-[6px] bottom-[6px] rounded-full bg-[#FFD900]"
              style={{
                width: BTN_WIDTH,
                left: 6,
                transform: view === "weeks" ? `translateX(${BTN_WIDTH}px)` : "translateX(0)",
                transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
            {(["months", "weeks"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => handleViewChange(v)}
                className="relative z-10 py-[4px] text-[12px] font-bold tracking-wide"
                style={{
                  width: BTN_WIDTH,
                  color: view === v ? "#000" : undefined,
                  opacity: view === v ? 1 : 0.4,
                  transition: "opacity 0.2s, color 0.2s",
                }}
              >
                {v === "months" ? "Månad" : "Vecka"}
              </button>
            ))}
          </div>

          <span className="text-[13px] font-bold tracking-wide">TOTALT {total}</span>
        </div>

        {/* Bars */}
        <div
          key={animKey}
          className="flex items-end"
          style={{ height: CHART_HEIGHT, gap: view === "weeks" ? 2 : 5 }}
        >
          {counts.map((count, i) => {
            const isCurrent = view === "months" ? i === currentMonth : i === currentWeekIndex;
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

      {/* Labels */}
      <div
        key={`labels-${animKey}`}
        className="flex mt-2 px-4"
        style={{ gap: view === "weeks" ? 2 : 5 }}
      >
        {labels.map((label, i) => {
          // For weeks, show every 5th label (1, 6, 11, 16 …)
          const showLabel = view === "months" || i % 5 === 0;
          return (
            <div
              key={i}
              className="flex-1 text-center text-[12px]"
              style={{
                opacity: view === "months"
                  ? (i <= currentMonth ? 0.5 : 0.25)
                  : (i === currentWeekIndex ? 0.7 : i < (currentWeekIndex ?? 52) ? 0.4 : 0.2),
              }}
            >
              {showLabel ? label : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
