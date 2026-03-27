import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkoutSession } from "../../types/models";
import { computeMuscleGroupVolume } from "../../utils/statistics";

interface Props {
  sessions: WorkoutSession[];
  userWeight: number;
}

const periods = [
  { label: "30 dagar", value: 30 as number | null },
  { label: "All tid", value: null as number | null },
];

export function StatsMuscleGroupVolume({ sessions, userWeight }: Props) {
  const [periodDays, setPeriodDays] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const result = useMemo(
    () => computeMuscleGroupVolume(sessions, userWeight, periodDays),
    [sessions, userWeight, periodDays]
  );

  if (!result.hasData) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
          Mest tränade muskelgrupper
        </span>
        <div className="rounded-card p-6 border border-black/10">
          <p className="text-[13px] opacity-50">
            Tilldela muskelgrupper till dina övningar för att se fördelningen.
          </p>
        </div>
      </div>
    );
  }

  const maxReps = result.groups[0]?.totalReps || 1;

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
          Mest tränade muskelgrupper
        </span>
        <div className="flex gap-1">
          {periods.map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriodDays(p.value)}
              className={`text-[11px] px-2 py-0.5 rounded-full transition-opacity ${
                periodDays === p.value
                  ? "bg-white/10 opacity-100"
                  : "opacity-40"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-card p-6 border border-black/10 flex flex-col gap-[2px]">
        {result.groups.map((group, i) => {
          const widthPct = (group.totalReps / maxReps) * 100;

          return (
            <div
              key={group.muscleGroupName}
              className="relative w-full rounded-[4px] overflow-hidden"
              style={{ background: "#f5f5f5" }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-[4px] transition-all ease-out"
                style={{
                  width: visible ? `${widthPct}%` : "0%",
                  backgroundColor: "#FFD900",
                  transitionDuration: "600ms",
                  transitionDelay: visible ? `${i * 40}ms` : "0ms",
                }}
              />
              <div className="relative flex items-center justify-between py-[4px] px-[8px]">
                <span className="text-[13px] font-medium text-black/70 truncate">
                  {group.muscleGroupName}
                </span>
                <span className="text-[12px] tabular-nums text-black shrink-0 ml-2">
                  {group.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
