import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { WorkoutSession } from "../../types/models";
import { formatShortDate } from "../../utils/formatDate";
import { formatDuration } from "../../utils/formatTime";
import { SwipeActions } from "../ui/SwipeToDelete";
import { calculateIntensity } from "../../utils/calculations";
import { useSettingsStore } from "../../stores/useSettingsStore";

const R = 14;
const SW = 4;
const SIZE = 2 * (R + SW / 2); // 30px — no empty space around stroke
const CX = SIZE / 2;
const CY = SIZE / 2;

function IntensityRing({ score }: { score: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  const circumference = 2 * Math.PI * R;
  const intensity = Math.min(100, Math.max(0, score));
  const progressArc = (intensity / 100) * circumference;
  const dashOffset = animated ? circumference - progressArc : circumference;

  return (
    <svg width={SIZE} height={SIZE} className="shrink-0 self-center">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="currentColor" strokeWidth={SW} strokeOpacity={0.1} />
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke="currentColor"
        strokeWidth={SW}
        strokeLinecap="butt"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${CX} ${CY})`}
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

interface CompletedWorkoutItemProps {
  session: WorkoutSession;
  onDelete: (id: string) => void;
}

export function CompletedWorkoutItem({ session, onDelete }: CompletedWorkoutItemProps) {
  const navigate = useNavigate();
  const { userWeight } = useSettingsStore();

  const duration = session.finishedAt
    ? formatDuration(session.startedAt, session.finishedAt, session.pausedDuration)
    : "–";

  const intensity = calculateIntensity(session, userWeight);

  return (
    <SwipeActions
      onDelete={() => onDelete(session.id)}
      confirmMessage="Är du säker på att du vill ta bort detta träningspass?"
    >
      <div
        className="bg-card rounded-card px-6 py-6 flex items-start gap-4 cursor-pointer"
        onClick={() => navigate(`/history/${session.id}`)}
      >
        <IntensityRing score={intensity.score} />
        <div className="flex-1 flex flex-col min-w-0">
          <span className="font-bold text-[15px] leading-[18px]">
            {formatShortDate(session.startedAt)}
          </span>
          <span className="text-[15px] leading-[18px] opacity-60">{session.categoryName}</span>
        </div>
        <span className="text-[12px] opacity-50 uppercase tracking-wider shrink-0">{duration}</span>
      </div>
    </SwipeActions>
  );
}
