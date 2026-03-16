import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { formatShortDate } from "../../utils/formatDate";
import { formatDuration } from "../../utils/formatTime";
import { calculateWorkoutTotals } from "../../utils/calculations";

export function WorkoutDetailView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { loadSessions, getSessionById } = useHistoryStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const session = sessionId ? getSessionById(sessionId) : undefined;

  if (!session) {
    return <p className="text-center opacity-50 pt-10">Träningspass hittades inte.</p>;
  }

  const duration = session.finishedAt
    ? formatDuration(session.startedAt, session.finishedAt, session.pausedDuration)
    : "–";

  const totals = calculateWorkoutTotals(session);

  return (
    <div className="flex flex-col gap-8 px-2">
      {/* Session header */}
      <div className="flex flex-col gap-1 items-center text-center">
        <div className="flex flex-col">
          <span className="text-[20px] font-bold leading-[25px]">
            {formatShortDate(session.startedAt)}
          </span>
          <span className="text-[20px] leading-[25px]">{session.categoryName}</span>
        </div>
        <span className="text-[12px] uppercase tracking-wider opacity-50">{duration}</span>
      </div>

      {/* Exercise logs */}
      {session.exerciseLogs.map((log) => (
        <div key={log.exerciseId} className="flex flex-col gap-2">
          <span className="font-bold text-[15px] leading-[18px]">{log.exerciseName}</span>
          <div className="flex flex-col">
            {log.sets.map((set) => (
              <div
                key={set.setNumber}
                className="flex py-3 text-[15px] leading-[18px] border-b border-black/10 dark:border-white/20 last:border-0"
              >
                <span className="flex-1 font-bold">S{set.setNumber}</span>
                <span className="flex-1 text-right">{set.reps} rep</span>
                <span className="flex-1 text-right">
                  {log.isBodyweight && set.weight > 0
                    ? `+${set.weight} kg`
                    : `${set.weight} kg`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Totals */}
      <div className="bg-card rounded-card p-4">
        <div className="flex px-6 py-3">
          <span className="w-[83px] font-bold text-[15px]">{totals.totalSets} set</span>
          <span className="w-[83px] text-[15px]">{totals.totalReps} rep</span>
          <span className="w-[83px] text-[15px]">{totals.totalWeight} kg</span>
        </div>
      </div>
    </div>
  );
}
