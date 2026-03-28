import { useRef, useState } from "react";
import type { SessionStats } from "../../utils/statistics";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { STATS_SESSION_OVERVIEW } from "../../constants/ui-strings";

interface Props {
  stats: SessionStats;
}

function formatMs(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  return `${minutes}m`;
}

function formatTotalTime(ms: number): string {
  const hours = Math.round(ms / 3600000);
  if (hours >= 1) return `${hours}h`;
  return formatMs(ms);
}

function formatRestTime(ms: number): string {
  if (ms <= 0) return "–";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function StatsSessionOverview({ stats }: Props) {
  const { showCalories } = useSettingsStore();

  const cards: { value: string; label: string }[] = [
    { value: formatMs(stats.avgDurationMs), label: STATS_SESSION_OVERVIEW.AVG_LENGTH },
    { value: formatTotalTime(stats.totalTrainingTimeMs), label: STATS_SESSION_OVERVIEW.TOTAL_TIME },
    { value: formatRestTime(stats.avgRestTimeMs), label: STATS_SESSION_OVERVIEW.AVG_REST },
  ];

  if (showCalories && stats.avgCalories > 0) {
    cards.push({ value: `${stats.avgCalories} kcal`, label: STATS_SESSION_OVERVIEW.AVG_CALORIES });
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const [grabbing, setGrabbing] = useState(false);

  const onMouseDown = (e: React.MouseEvent) => {
    drag.current = { active: true, startX: e.clientX, scrollLeft: scrollRef.current?.scrollLeft ?? 0 };
    setGrabbing(true);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current.active || !scrollRef.current) return;
    e.preventDefault();
    scrollRef.current.scrollLeft = drag.current.scrollLeft - (e.clientX - drag.current.startX);
  };
  const onMouseUp = () => {
    drag.current.active = false;
    setGrabbing(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
        {STATS_SESSION_OVERVIEW.TITLE}
      </span>

      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-2 pb-1 scrollbar-none"
        style={{
          marginLeft: -32,
          marginRight: -32,
          overscrollBehaviorX: "contain",
          cursor: grabbing ? "grabbing" : "grab",
          userSelect: "none",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div className="min-w-6 shrink-0" />
        {cards.map((card, i) => (
          <div
            key={card.label}
            className="border border-black/10 dark:border-white/10 rounded-card p-4 flex flex-col flex-none animate-in"
            style={{
              width: "calc(min(100vw, 600px) / 3 - 10px)",
              minWidth: "calc(min(100vw, 600px) / 3 - 10px)",
              animationDelay: `${i * 0.04}s`,
            }}
          >
            <span className="text-[20px] font-bold">{card.value}</span>
            <div className="h-10" />
            <span className="text-[12px] uppercase tracking-wider">{card.label}</span>
          </div>
        ))}
        <div className="min-w-6 shrink-0" />
      </div>
    </div>
  );
}
