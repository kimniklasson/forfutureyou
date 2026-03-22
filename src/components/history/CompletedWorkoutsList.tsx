import { useEffect } from "react";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { CompletedWorkoutItem } from "./CompletedWorkoutItem";
import { WorkoutBarChart } from "./WorkoutBarChart";

export function CompletedWorkoutsList() {
  const { loadSessions, getGroupedByMonth, deleteSession } = useHistoryStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const { sessions } = useHistoryStore();
  const groups = getGroupedByMonth();
  const isEmpty = groups.length === 0;

  return (
    <div className="flex flex-col gap-10">
      {/* Header text */}
      <div className="flex flex-col items-center text-center">
        <span className="text-[20px] font-bold leading-[1.22]">Historik</span>
        <span className="text-[20px] leading-[1.22] opacity-50">
          Dina genomförda träningspass
        </span>
      </div>

      {/* Bar chart */}
      <WorkoutBarChart sessions={sessions} />

      {isEmpty && (
        <p className="text-[15px] opacity-50 text-center pt-4">
          Inga träningspass ännu.
        </p>
      )}

      {/* Month groups */}
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <span className="font-bold text-[12px] uppercase tracking-wider">
            {group.label}
          </span>
          <div className="flex flex-col gap-2">
            {group.sessions.map((session) => (
              <CompletedWorkoutItem
                key={session.id}
                session={session}
                onDelete={deleteSession}
              />
            ))}
          </div>
        </div>
      ))}

    </div>
  );
}
