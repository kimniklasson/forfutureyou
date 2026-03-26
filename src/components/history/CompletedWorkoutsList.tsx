import { useEffect, useMemo } from "react";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { useCategoryStore } from "../../stores/useCategoryStore";
import { CompletedWorkoutItem } from "./CompletedWorkoutItem";
import { WorkoutBarChart } from "./WorkoutBarChart";
import { FadeInOnScroll } from "../ui/FadeInOnScroll";
import { getCategoryColor } from "../../utils/categoryColors";

export function CompletedWorkoutsList() {
  const { loadSessions, getGroupedByMonth, deleteSession } = useHistoryStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const { sessions } = useHistoryStore();
  const { categories } = useCategoryStore();
  const groups = getGroupedByMonth();

  // Bygg färgkarta från kategoriernas egna colorIndex (permanent, ordningsoberoende)
  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      map.set(cat.id, getCategoryColor(cat.colorIndex));
    }
    // Fallback för pass vars kategori raderats
    for (const s of sessions) {
      if (!map.has(s.categoryId)) {
        map.set(s.categoryId, getCategoryColor(map.size));
      }
    }
    return map;
  }, [categories, sessions]);
  const isEmpty = groups.length === 0;

  return (
    <div className="flex flex-col gap-10">
      {/* Header text */}
      <div className="flex flex-col items-center text-center">
        <span className="text-[20px] font-bold leading-[1.22]">Historik</span>
        <span className="text-[20px] leading-[1.22] opacity-50">
          Genomförda träningspass
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
        <FadeInOnScroll key={group.label}>
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
              {group.label}
            </span>
            <div className="flex flex-col gap-2">
              {group.sessions.map((session, i) => (
                <FadeInOnScroll key={session.id} delay={i * 80}>
                  <CompletedWorkoutItem
                    session={session}
                    onDelete={deleteSession}
                    categoryColor={categoryColorMap.get(session.categoryId)}
                  />
                </FadeInOnScroll>
              ))}
            </div>
          </div>
        </FadeInOnScroll>
      ))}

    </div>
  );
}
