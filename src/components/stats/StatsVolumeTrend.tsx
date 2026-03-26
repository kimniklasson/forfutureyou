import { useMemo, useState } from "react";
import type { WorkoutSession } from "../../types/models";
import { computeVolumeProgressionByCategory } from "../../utils/statistics";
import { getCategoryColor } from "../../utils/categoryColors";
import { StatsMultiLineChart, type ChartSeries } from "./StatsMultiLineChart";
import { IconInfo } from "../ui/icons";
import { InfoModal } from "../ui/InfoModal";

interface Props {
  sessions: WorkoutSession[];
  categoryNameToIndex: Map<string, number>;
}

const formatVolume = (v: number) => `${Math.round(v / 1000 * 10) / 10}k kg`;

export function StatsVolumeTrend({ sessions, categoryNameToIndex }: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
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

  if (seriesList.length === 0) return null;

  return (
    <div className="flex-1 rounded-card border border-black/10 dark:border-white/10 px-6 py-4 flex flex-col items-center gap-2">
      <StatsMultiLineChart
        seriesList={seriesList}
        formatValue={formatVolume}
      />
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setInfoOpen(true)}
          className="opacity-40 hover:opacity-70 transition-opacity"
        >
          <IconInfo size={13} />
        </button>
        <span className="text-[12px] font-medium uppercase tracking-wider opacity-50">
          Träningsvolym
        </span>
      </div>
      <InfoModal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="Träningsvolym"
        description="Visar din totala träningsvolym (set × reps × vikt) per kategori och vecka. Hjälper dig följa om du ökar din totala träningsbelastning över tid."
      />
    </div>
  );
}
