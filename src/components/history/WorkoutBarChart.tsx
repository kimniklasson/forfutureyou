import { useState, useMemo, useEffect, useRef } from "react";
import type { WorkoutSession } from "../../types/models";

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const CHART_HEIGHT = 88; // px

interface Props {
  sessions: WorkoutSession[];
}

export function WorkoutBarChart({ sessions }: Props) {
  const [tooltip, setTooltip] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const { monthlyCounts, total } = useMemo(() => {
    const counts = new Array(12).fill(0);
    for (const session of sessions) {
      const d = new Date(session.startedAt);
      if (d.getFullYear() === currentYear) counts[d.getMonth()]++;
    }
    return { monthlyCounts: counts, total: counts.reduce((a, b) => a + b, 0) };
  }, [sessions, currentYear]);

  const maxCount = Math.max(...monthlyCounts, 1);

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
      {/* Chart card — no bottom padding so bars are flush */}
      <div className="rounded-card border border-black/10 dark:border-white/10 px-4 pt-4 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-baseline mb-4">
          <span className="text-[13px] font-medium opacity-50">{currentYear}</span>
          <span className="text-[13px] font-bold tracking-wide">TOTALT {total}</span>
        </div>

        {/* Bars */}
        <div className="flex items-end gap-[5px]" style={{ height: CHART_HEIGHT }}>
          {monthlyCounts.map((count, i) => {
            const isCurrent = i === currentMonth;
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
                    {/* Arrow */}
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
                      background: isCurrent ? "#F5C800" : "rgba(128,128,128,0.55)",
                      opacity: isSelected ? 0.75 : 1,
                    }}
                  />
                ) : (
                  // Invisible tap target for empty months
                  <div className="w-full h-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month labels — outside the card */}
      <div className="flex gap-[5px] mt-2 px-4">
        {MONTH_LABELS.map((label, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[11px]"
            style={{ opacity: i <= currentMonth ? 0.5 : 0.25 }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
