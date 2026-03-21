import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ExercisePR, SessionRecord } from "../../utils/statistics";
import { formatKg } from "../../utils/formatNumber";
import { IconChevronRight } from "../ui/icons";

interface Props {
  prs: ExercisePR[];
  volumeRecord: SessionRecord | null;
  setsRecord: SessionRecord | null;
  longestWorkout: SessionRecord | null;
}

function formatDurationFromMs(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  return `${minutes}m`;
}

export function StatsPersonalRecords({ prs, volumeRecord, setsRecord, longestWorkout }: Props) {
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();
  const displayPrs = showAll ? prs : prs.slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
        Personliga rekord
      </span>

      {/* Session records — 3 cards in a row */}
      <div className="grid grid-cols-3 gap-2">
        <RecordCard
          value={volumeRecord ? formatKg(volumeRecord.value) : "-"}
          label="Volymrekord"
          delay={0}
        />
        <RecordCard
          value={setsRecord ? `${setsRecord.value}` : "-"}
          label="Flest set"
          delay={1}
        />
        <RecordCard
          value={longestWorkout ? formatDurationFromMs(longestWorkout.value) : "-"}
          label="Längsta pass"
          delay={2}
        />
      </div>

      {/* Exercise PR list */}
      <div className="flex flex-col gap-2">
        {displayPrs.map((pr, i) => (
          <button
            key={pr.exerciseId}
            onClick={() => navigate(`/stats/exercise/${pr.exerciseId}`)}
            className="bg-card rounded-card p-4 flex items-center gap-3 w-full text-left animate-in"
            style={{ animationDelay: `${(i + 3) * 0.04}s` }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold leading-[18px]">{pr.exerciseName}</div>
              <div className="text-[13px] opacity-50 mt-1">
                {pr.isBodyweight ? (
                  <>
                    {pr.maxRepsBodyweight} reps
                    {pr.maxWeight > 0 && ` · ${pr.maxWeight} kg extra`}
                  </>
                ) : (
                  <>
                    {pr.maxWeight} kg · {pr.maxRepsAtMaxWeight} reps
                    {pr.estimated1RM > 0 && ` · 1RM: ${pr.estimated1RM} kg`}
                  </>
                )}
              </div>
            </div>
            <IconChevronRight size={16} className="opacity-30 shrink-0" />
          </button>
        ))}
      </div>

      {prs.length > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-[13px] font-bold opacity-50 py-2"
        >
          Visa alla ({prs.length})
        </button>
      )}
    </div>
  );
}

function RecordCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <div
      className="bg-card rounded-card p-4 flex flex-col gap-1 animate-in"
      style={{ animationDelay: `${delay * 0.04}s` }}
    >
      <span className="text-[17px] font-bold leading-tight">{value}</span>
      <span className="text-[11px] opacity-50 uppercase tracking-wider leading-tight">{label}</span>
    </div>
  );
}
