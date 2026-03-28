import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useHistoryStore } from "../stores/useHistoryStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { computeSingleExercisePR, computeEventProgression, computeEventVolume } from "../utils/statistics";
import { StatsLineChart } from "../components/stats/StatsLineChart";
import { IconArrowLeft } from "../components/ui/icons";
import { MONTH_NAMES, PROGRESS, TIME, EXERCISES } from "../constants/ui-strings";

const MONTHS_SV = [...MONTH_NAMES];

export function ExerciseProgressPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const { sessions, loadSessions } = useHistoryStore();
  const userWeight = useSettingsStore((s) => s.userWeight);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const pr = useMemo(() => exerciseId ? computeSingleExercisePR(exerciseId, sessions) : null, [exerciseId, sessions]);

  const isBodyweight = pr?.isBodyweight ?? false;

  const allPoints = useMemo(() => {
    if (!exerciseId) return [];
    return computeEventProgression(exerciseId, sessions, isBodyweight);
  }, [exerciseId, sessions, isBodyweight]);

  const allVolumePoints = useMemo(() => {
    if (!exerciseId) return [];
    return computeEventVolume(exerciseId, sessions, isBodyweight, userWeight);
  }, [exerciseId, sessions, isBodyweight, userWeight]);

  const [viewMode, setViewMode] = useState<"year" | "month">("year");
  const [offset, setOffset] = useState(0);

  // Reset offset when switching view mode
  const handleViewMode = (mode: "year" | "month") => {
    setViewMode(mode);
    setOffset(0);
  };

  const now = new Date();

  const { targetYear, targetMonth } = useMemo(() => {
    if (viewMode === "year") {
      return { targetYear: now.getFullYear() + offset, targetMonth: -1 };
    }
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { targetYear: d.getFullYear(), targetMonth: d.getMonth() };
  }, [viewMode, offset]);

  const filteredPoints = useMemo(() => {
    return allPoints.filter((p) => {
      const d = new Date(p.date);
      if (viewMode === "year") return d.getFullYear() === targetYear;
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });
  }, [allPoints, viewMode, targetYear, targetMonth]);

  const filteredVolumePoints = useMemo(() => {
    return allVolumePoints.filter((p) => {
      const d = new Date(p.date);
      if (viewMode === "year") return d.getFullYear() === targetYear;
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });
  }, [allVolumePoints, viewMode, targetYear, targetMonth]);

  const periodLabel = useMemo(() => {
    if (viewMode === "year") return `${targetYear}`;
    return `${MONTHS_SV[targetMonth]} ${targetYear}`;
  }, [viewMode, targetYear, targetMonth]);

  const { canGoBack, canGoForward } = useMemo(() => {
    if (allPoints.length === 0) return { canGoBack: false, canGoForward: false };
    const earliest = new Date(allPoints[0].date);
    const latest = new Date(allPoints[allPoints.length - 1].date);

    if (viewMode === "year") {
      return {
        canGoBack: targetYear > earliest.getFullYear(),
        canGoForward: targetYear < latest.getFullYear(),
      };
    }
    const targetDate = new Date(targetYear, targetMonth, 1);
    const earliestPeriod = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const latestPeriod = new Date(latest.getFullYear(), latest.getMonth(), 1);
    return {
      canGoBack: targetDate > earliestPeriod,
      canGoForward: targetDate < latestPeriod,
    };
  }, [allPoints, viewMode, targetYear, targetMonth]);

  const chartData = filteredPoints.map((p) => ({ label: p.label, value: p.value }));
  const volumeChartData = filteredVolumePoints.map((p) => ({ label: p.label, value: p.value }));
  const unit = isBodyweight ? "reps" : "kg";
  const volumeUnit = isBodyweight ? "reps" : "kg";

  if (!pr) {
    return (
      <div className="flex flex-col items-center text-center pt-8">
        <p className="text-[15px] opacity-50">{EXERCISES.EXERCISE_NOT_FOUND}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <span className="text-[20px] font-bold leading-[1.22]">{pr.exerciseName}</span>
        <span className="text-[15px] opacity-50 mt-1">
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
        </span>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2 justify-center">
        {(["year", "month"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => handleViewMode(mode)}
            className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
              viewMode === mode
                ? "bg-black dark:bg-white text-white dark:text-black"
                : "bg-black/5 dark:bg-white/10 opacity-60"
            }`}
          >
            {mode === "year" ? TIME.YEAR : TIME.MONTH}
          </button>
        ))}
      </div>

      {/* Period navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => canGoBack && setOffset((o) => o - 1)}
          className={`p-2 ${canGoBack ? "" : "opacity-20 pointer-events-none"}`}
        >
          <IconArrowLeft size={18} />
        </button>
        <span className="text-[15px] font-bold">{periodLabel}</span>
        <button
          onClick={() => canGoForward && setOffset((o) => o + 1)}
          className={`p-2 ${canGoForward ? "" : "opacity-20 pointer-events-none"}`}
        >
          <IconArrowLeft size={18} className="rotate-180" />
        </button>
      </div>

      {/* Charts */}
      {chartData.length > 0 ? (
        <StatsLineChart key={`best-${viewMode}-${offset}`} data={chartData} unit={unit} title={PROGRESS.HEAVIEST_LIFT} />
      ) : (
        <div className="rounded-card border border-black/10 dark:border-white/10 p-4">
          <p className="text-[12px] opacity-50 text-center">{PROGRESS.NO_SESSIONS}</p>
        </div>
      )}

      {volumeChartData.length > 0 && (
        <StatsLineChart key={`vol-${viewMode}-${offset}`} data={volumeChartData} unit={volumeUnit} title={PROGRESS.TOTAL_VOLUME} />
      )}
    </div>
  );
}
