import { useEffect, useMemo } from "react";
import { useHistoryStore } from "../stores/useHistoryStore";
import { useCategoryStore } from "../stores/useCategoryStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { StatsPersonalRecords } from "../components/stats/StatsPersonalRecords";
import { StatsStreaks } from "../components/stats/StatsStreaks";
import { StatsSessionOverview } from "../components/stats/StatsSessionOverview";
import { StatsOverviewCards } from "../components/stats/StatsOverviewCards";
import { StatsStrengthTrend } from "../components/stats/StatsStrengthTrend";
import { StatsVolumeTrend } from "../components/stats/StatsVolumeTrend";
import { FadeInOnScroll } from "../components/ui/FadeInOnScroll";
import * as stats from "../utils/statistics";

export function StatsPage() {
  const { sessions, loadSessions } = useHistoryStore();
  const { categories, loadCategories } = useCategoryStore();
  const { userWeight, userAge, userSex } = useSettingsStore();

  useEffect(() => {
    loadSessions();
    loadCategories();
  }, [loadSessions, loadCategories]);

  const prs = useMemo(() => stats.computeExercisePRs(sessions), [sessions]);
  const streaks = useMemo(() => stats.computeStreaks(sessions), [sessions]);
  const sessionStats = useMemo(
    () => stats.computeSessionStats(sessions, userWeight, userAge, userSex),
    [sessions, userWeight, userAge, userSex]
  );

  const insights = useMemo(() => {
    const allExercises = categories.flatMap((c) => c.exercises.map((e) => ({ id: e.id, name: e.name })));
    return stats.computeExerciseInsights(sessions, allExercises);
  }, [sessions, categories]);

  const categoryNameToIndex = useMemo(() => {
    const map = new Map<string, number>();
    categories.forEach((c, i) => map.set(c.name, i));
    return map;
  }, [categories]);

  const isEmpty = sessions.length === 0;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-center text-center">
        <span className="text-[20px] font-bold leading-[1.22]">Statistik</span>
        <span className="text-[20px] leading-[1.22] opacity-50">
          Framsteg och rekord
        </span>
      </div>

      {isEmpty ? (
        <p className="text-[15px] opacity-50 text-center pt-4">
          Inga träningspass ännu.
        </p>
      ) : (
        <>
          <FadeInOnScroll>
            <div className="flex flex-col gap-2">
              <StatsOverviewCards stats={sessionStats} insights={insights} categoryNameToIndex={categoryNameToIndex} />
              <div className="flex gap-2">
                <StatsStrengthTrend sessions={sessions} categoryNameToIndex={categoryNameToIndex} />
                <StatsVolumeTrend sessions={sessions} categoryNameToIndex={categoryNameToIndex} />
              </div>
            </div>
          </FadeInOnScroll>
          <FadeInOnScroll>
            <StatsPersonalRecords prs={prs} />
          </FadeInOnScroll>
          <FadeInOnScroll>
            <div className="flex flex-col gap-8">
              <StatsStreaks streaks={streaks} />
              <StatsSessionOverview stats={sessionStats} />
            </div>
          </FadeInOnScroll>
        </>
      )}
    </div>
  );
}
