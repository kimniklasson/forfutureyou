import { useMemo } from "react";
import type { WorkoutSession } from "../../types/models";
import { computeCategoryStrengthIndex } from "../../utils/statistics";
import { getCategoryColor } from "../../utils/categoryColors";
import type { ChartSeries } from "./StatsMultiLineChart";
import { StatsTrendCard } from "./StatsTrendCard";
import { STATS_STRENGTH_TREND } from "../../constants/ui-strings";

interface Props {
  sessions: WorkoutSession[];
  categoryNameToIndex: Map<string, number>;
}

const formatStrength = (v: number) => `${v}%`;

export function StatsStrengthTrend({ sessions, categoryNameToIndex }: Props) {
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

  return (
    <StatsTrendCard
      seriesList={seriesList}
      showBaseline
      formatValue={formatStrength}
      title={STATS_STRENGTH_TREND.TITLE}
      description={STATS_STRENGTH_TREND.DESCRIPTION}
    />
  );
}
