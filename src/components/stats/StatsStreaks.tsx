import { useRef, useState } from "react";
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
        Streak & kontinuitet
      </span>

      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-2 pb-1 scrollbar-none"
        style={{
          marginLeft: -32,
          marginRight: -32,
          touchAction: "pan-x",
          overscrollBehaviorX: "contain",
          cursor: grabbing ? "grabbing" : "grab",
          userSelect: "none",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div style={{ minWidth: 24, flexShrink: 0 }} />
        {cards.map((card, i) => (
          <div
            key={card.label}
            className="bg-white rounded-card p-4 flex flex-col flex-none animate-in"
            style={{
              width: "calc(min(100vw, 600px) / 3 - 10px)",
              minWidth: "calc(min(100vw, 600px) / 3 - 10px)",
              border: "1px solid rgba(0,0,0,0.1)",
              animationDelay: `${i * 0.04}s`,
            }}
          >
            <span className="text-[20px] font-bold">
              {card.value}{card.unit ? ` ${card.unit}` : ""}
            </span>
            <div style={{ height: 40 }} />
            <span className="text-[11px] uppercase tracking-wider">{card.label}</span>
          </div>
        ))}
        <div style={{ minWidth: 24, flexShrink: 0 }} />
      </div>
    </div>
  );
}
