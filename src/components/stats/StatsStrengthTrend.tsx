import { useMemo, useState } from "react";
import type { WorkoutSession } from "../../types/models";
import { computeCategoryStrengthIndex } from "../../utils/statistics";
import { getCategoryColor } from "../../utils/categoryColors";
import { StatsMultiLineChart, type ChartSeries } from "./StatsMultiLineChart";
import { IconInfo } from "../ui/icons";
import { InfoModal } from "../ui/InfoModal";

interface Props {
  sessions: WorkoutSession[];
  categoryNameToIndex: Map<string, number>;
}

const formatStrength = (v: number) => `${v}%`;

export function StatsStrengthTrend({ sessions, categoryNameToIndex }: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { series } = useMemo(
    () => computeCategoryStrengthIndex(sessions),
    [sessions]
  );

  const seriesList = useMemo<ChartSeries[]>(() => series.map((s) => ({
    key: s.categoryId,
    label: s.categoryName,
    color: getCategoryColor(categoryNameToIndex.get(s.categoryName) ?? 0),
    points: s.points.map((p) => ({
      timeKey: p.monthKey,
      displayLabel: p.label,
      value: p.value,
    })),
  })), [series, categoryNameToIndex]);

  if (seriesList.length === 0) return null;

  return (
    <div className="flex-1 rounded-card border border-black/10 dark:border-white/10 px-6 py-4 flex flex-col items-center gap-2">
      <StatsMultiLineChart
        seriesList={seriesList}
        showBaseline
        formatValue={formatStrength}
      />
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setInfoOpen(true)}
          className="opacity-40 hover:opacity-70 transition-opacity"
        >
          <IconInfo size={13} />
        </button>
        <span className="text-[12px] font-medium uppercase tracking-wider opacity-50">
          Styrketrend
        </span>
      </div>
      <InfoModal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="Styrketrend"
        description="Visar din relativa styrkeutveckling per kategori över tid. 100% är din utgångsnivå – kurvan visar hur din beräknade maxstyrka (e1RM) förändrats sedan start."
      />
    </div>
  );
}
