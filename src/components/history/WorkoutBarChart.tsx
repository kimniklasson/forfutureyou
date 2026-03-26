import { useState, useMemo, useEffect, useRef } from "react";
import type { WorkoutSession } from "../../types/models";
import { getCategoryColor } from "../../utils/categoryColors";
import { useCategoryStore } from "../../stores/useCategoryStore";

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const CHART_HEIGHT = 112; // px
const BTN_WIDTH = 66; // px — fixed width so toggle never shifts layout

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
  const [barsVisible, setBarsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { categories } = useCategoryStore();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Bygg färgkarta från kategoriernas egna colorIndex (permanent, ordningsoberoende)
  const categoryColorMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const cat of categories) {
      map.set(cat.id, { name: cat.name, color: getCategoryColor(cat.colorIndex) });
    }
    // Fallback för pass vars kategori raderats
    for (const s of sessions) {
      if (!map.has(s.categoryId)) {
        map.set(s.categoryId, { name: s.categoryName, color: getCategoryColor(map.size) });
      }
    }
    return map;
  }, [categories, sessions]);

  // Monthly data — broken down by category
  const { monthlyData, monthlyTotal } = useMemo(() => {
    const data: { categoryId: string; count: number }[][] = Array.from(
      { length: 12 },
      () => []
    );
    for (const session of sessions) {
      const d = new Date(session.startedAt);
      if (d.getFullYear() === currentYear) {
        const month = d.getMonth();
        const existing = data[month].find((e) => e.categoryId === session.categoryId);
        if (existing) existing.count++;
        else data[month].push({ categoryId: session.categoryId, count: 1 });
      }
    }
    const total = data.reduce(
      (sum, month) => sum + month.reduce((s, e) => s + e.count, 0),
      0
    );
    return { monthlyData: data, monthlyTotal: total };
  }, [sessions, currentYear]);

  // Weekly data — all ISO weeks of current year
  const { weeklyData, weekLabels, weeklyTotal, currentWeekIndex } = useMemo(() => {
    const jan4 = new Date(currentYear, 0, 4);
    const dow = jan4.getDay() || 7;
    const week1Monday = new Date(jan4);
    week1Monday.setDate(jan4.getDate() - dow + 1);
    week1Monday.setHours(0, 0, 0, 0);

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

    const data: { categoryId: string; count: number }[][] = weeks.map(({ start, end }) => {
      const weekSessions = sessions.filter((s) => {
        const d = new Date(s.startedAt);
        return d >= start && d < end;
      });
      const catMap = new Map<string, number>();
      for (const s of weekSessions) {
        catMap.set(s.categoryId, (catMap.get(s.categoryId) ?? 0) + 1);
      }
      return Array.from(catMap.entries()).map(([categoryId, count]) => ({
        categoryId,
        count,
      }));
    });

    const labels = weeks.map((_, i) => String(i + 1));
    const total = data.reduce((sum, w) => sum + w.reduce((s, e) => s + e.count, 0), 0);
    const todayMs = Date.now();
    const cwIndex = weeks.findIndex(
      ({ start, end }) => todayMs >= start.getTime() && todayMs < end.getTime()
    );

    return { weeklyData: data, weekLabels: labels, weeklyTotal: total, currentWeekIndex: cwIndex };
  }, [sessions, currentYear]);

  const barData = view === "months" ? monthlyData : weeklyData;
  const labels = view === "months" ? MONTH_LABELS : weekLabels;
  const total = view === "months" ? monthlyTotal : weeklyTotal;
  const counts = barData.map((b) => b.reduce((s, e) => s + e.count, 0));
  const maxCount = Math.max(...counts, 1);

  const handleViewChange = (newView: View) => {
    if (newView === view) return;
    setTooltip(null);
    setBarsVisible(false);
    setView(newView);
    setAnimKey((k) => k + 1);
    setTimeout(() => setBarsVisible(true), 32);
  };

  useEffect(() => {
    const t = setTimeout(() => setBarsVisible(true), 32);
    return () => clearTimeout(t);
  }, []);

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
      <div className="rounded-card border border-black/10 dark:border-white/10 px-4 pt-5">
        {/* Header */}
        <div className="relative flex justify-between items-center mb-6">
          <span className="text-[12px] font-medium opacity-50">{currentYear}</span>

          {/* Segmented pill toggle — absolutely centered */}
          <div className="absolute left-1/2 -translate-x-1/2 flex rounded-full p-[6px] border border-black/10 dark:border-white/10">
            {/* Sliding indicator */}
            <div
              className="absolute top-[6px] bottom-[6px] rounded-full bg-black dark:bg-white"
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
                className={`relative z-10 py-[4px] text-[12px] font-bold tracking-wide transition-opacity ${
                  view === v ? "text-white dark:text-black opacity-100" : "opacity-40"
                }`}
                style={{ width: BTN_WIDTH }}
              >
                {v === "months" ? "MÅNAD" : "VECKA"}
              </button>
            ))}
          </div>

          <span className="text-[12px] font-bold tracking-wide">TOTALT {total}</span>
        </div>

        {/* Bars */}
        <div
          key={animKey}
          className="flex items-end"
          style={{ height: CHART_HEIGHT, gap: view === "weeks" ? 2 : 5 }}
        >
          {barData.map((catEntries, i) => {
            const count = counts[i];
            const isCurrent = view === "months" ? i === currentMonth : i === currentWeekIndex;
            const heightPct = count > 0 ? Math.max((count / maxCount) * 100, 6) : 0;
            const isSelected = tooltip === i;

            return (
              <div
                key={i}
                className="relative flex-1 flex flex-col justify-end h-full cursor-pointer"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (count > 0) setTooltip(isSelected ? null : i);
                }}
              >
                {/* Tooltip */}
                {isSelected && count > 0 && (
                  <div
                    className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-10
                      bg-black dark:bg-white text-white dark:text-black
                      px-[9px] py-[6px] rounded-lg whitespace-nowrap
                      shadow-sm pointer-events-none"
                  >
                    {/* Total — 100% storlek */}
                    <div className="text-[12px] font-semibold leading-tight">
                      {count} pass
                    </div>

                    {/* Kategorier — 60% storlek */}
                    {catEntries.length > 0 && (
                      <div className="mt-[4px] flex flex-col gap-[2px]">
                        {catEntries.map(({ categoryId, count: catCount }) => {
                          const cat = categoryColorMap.get(categoryId);
                          return (
                            <div
                              key={categoryId}
                              className="flex items-center gap-[4px] text-[12px] font-medium"
                            >
                              <div
                                className="rounded-full flex-shrink-0"
                                style={{
                                  width: 5,
                                  height: 5,
                                  background: cat?.color ?? "#FFD900",
                                }}
                              />
                              <span style={{ opacity: 0.6 }}>{cat?.name ?? categoryId}</span>
                              <span className="ml-auto pl-[6px]" style={{ opacity: 0.6 }}>{catCount}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Pil */}
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2
                        border-4 border-transparent border-t-black dark:border-t-white"
                    />
                  </div>
                )}

                {/* Staplad stapel med kategorifärger */}
                {count > 0 ? (
                  <div
                    className="rounded-t-[3px] w-full overflow-hidden flex flex-col-reverse"
                    style={{
                      height: `${barsVisible ? heightPct : 0}%`,
                      opacity: isSelected ? 0.6 : isCurrent ? 1 : 0.8,
                      transition: `height 0.4s cubic-bezier(0.4,0,0.2,1) ${
                        i * (view === "weeks" ? 4 : 16)
                      }ms, opacity 0.15s`,
                    }}
                  >
                    {catEntries.map(({ categoryId, count: catCount }) => {
                      const cat = categoryColorMap.get(categoryId);
                      return (
                        <div
                          key={categoryId}
                          style={{
                            flex: catCount,
                            background: cat?.color ?? "#FFD900",
                          }}
                        />
                      );
                    })}
                  </div>
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
          const showLabel = view === "months" || i % 5 === 0;
          return (
            <div
              key={i}
              className="flex-1 text-center text-[12px]"
              style={{
                opacity:
                  view === "months"
                    ? i <= currentMonth
                      ? 0.5
                      : 0.25
                    : i === currentWeekIndex
                    ? 0.7
                    : i < (currentWeekIndex ?? 52)
                    ? 0.4
                    : 0.2,
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
