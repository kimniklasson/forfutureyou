import { useMemo } from "react";
import type { WorkoutSession } from "../../types/models";
import { computeVolumeProgressionByCategory } from "../../utils/statistics";
import { getCategoryColor } from "../../utils/categoryColors";
import type { ChartSeries } from "./StatsMultiLineChart";
import { StatsTrendCard } from "./StatsTrendCard";
import { STATS_VOLUME_TREND } from "../../constants/ui-strings";

interface Props {
  sessions: WorkoutSession[];
  categoryNameToIndex: Map<string, number>;
}

const formatVolume = (v: number) => `${Math.round(v / 1000 * 10) / 10}k kg`;

export function StatsVolumeTrend({ sessions, categoryNameToIndex }: Props) {
  const categorySeries = useMemo(
    () => computeVolumeProgressionByCategory(sessions),
    [sessions]
  );

  const seriesList = useMemo<ChartSeries[]>(() => categorySeries.map((s) => ({
    key: s.categoryId,
    label: s.categoryName,
    color: getCategoryColor(categoryNameToIndex.get(s.categoryName) ?? 0),
    points: s.points.map((p) => ({
      timeKey: p.weekKey,
      displayLabel: p.label,
      value: p.value,
    })),
  })), [categorySeries, categoryNameToIndex]);

  return (
    <StatsTrendCard
      seriesList={seriesList}
      formatValue={formatVolume}
      title={STATS_VOLUME_TREND.TITLE}
      description={STATS_VOLUME_TREND.DESCRIPTION}
    />
  );
}
