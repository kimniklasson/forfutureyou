import type { SessionStats } from "../../utils/statistics";
import { useSettingsStore } from "../../stores/useSettingsStore";

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
    { value: formatMs(stats.avgDurationMs), label: "Snittlängd" },
    { value: formatTotalTime(stats.totalTrainingTimeMs), label: "Total träningstid" },
    { value: stats.avgIntensityScore > 0 ? `${stats.avgIntensityScore}/100` : "–", label: "Snitt intensitet" },
    { value: formatRestTime(stats.avgRestTimeMs), label: "Snitt vila" },
  ];

  if (showCalories && stats.avgCalories > 0) {
    cards.push({ value: `${stats.avgCalories} kcal`, label: "Snitt kalorier" });
  }

  return (
    <div className="flex flex-col gap-4">
      <span className="text-[12px] font-bold uppercase tracking-wider opacity-50 px-4">
        Passöversikt
      </span>

      <div className="flex overflow-x-auto gap-3 px-4 pb-1 scrollbar-none snap-x snap-mandatory">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className="bg-white rounded-card p-4 flex flex-col flex-none animate-in snap-start"
            style={{
              width: "calc(33.333vw - 20px)",
              minWidth: "calc(33.333vw - 20px)",
              border: "1px solid rgba(0,0,0,0.1)",
              animationDelay: `${i * 0.04}s`,
            }}
          >
            <span className="text-[20px] font-bold">{card.value}</span>
            <div style={{ height: 40 }} />
            <span className="text-[11px] opacity-50 uppercase tracking-wider">{card.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
