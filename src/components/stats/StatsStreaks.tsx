import type { StreakInfo } from "../../utils/statistics";

interface Props {
  streaks: StreakInfo;
}

export function StatsStreaks({ streaks }: Props) {
  const cards = [
    { value: `${streaks.mostWorkoutsInWeek}`, label: "Bästa vecka", unit: "pass" },
    { value: `${streaks.mostWorkoutsInMonth}`, label: "Bästa månad", unit: "pass" },
    { value: `${streaks.avgWorkoutsPerWeek4w}`, label: "Snitt/vecka (4v)", unit: "pass" },
    { value: streaks.favoriteDay, label: "Favoritdag", unit: "" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
        Streak & kontinuitet
      </span>

      <div
        className="flex overflow-x-auto gap-3 pb-1 scrollbar-none snap-x snap-mandatory"
        style={{ marginLeft: -32, marginRight: -32 }}
      >
        {cards.map((card, i) => (
          <div
            key={card.label}
            className="bg-white rounded-card p-4 flex flex-col flex-none animate-in snap-start"
            style={{
              width: "calc(min(100vw, 600px) / 3 - 8px)",
              minWidth: "calc(min(100vw, 600px) / 3 - 8px)",
              border: "1px solid rgba(0,0,0,0.1)",
              animationDelay: `${i * 0.04}s`,
              marginLeft: i === 0 ? 32 : 0,
              marginRight: i === cards.length - 1 ? 32 : 0,
            }}
          >
            <span className="text-[20px] font-bold">
              {card.value}{card.unit ? ` ${card.unit}` : ""}
            </span>
            <div style={{ height: 40 }} />
            <span className="text-[11px] uppercase tracking-wider">{card.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
