import { useState } from "react";
import { StatsMultiLineChart, type ChartSeries } from "./StatsMultiLineChart";
import { IconInfo } from "../ui/icons";
import { InfoModal } from "../ui/InfoModal";

interface Props {
  seriesList: ChartSeries[];
  showBaseline?: boolean;
  formatValue: (v: number) => string;
  title: string;
  description: string;
}

export function StatsTrendCard({ seriesList, showBaseline, formatValue, title, description }: Props) {
  const [infoOpen, setInfoOpen] = useState(false);

  if (seriesList.length === 0) return null;

  return (
    <div className="flex-1 rounded-card border border-black/10 dark:border-white/10 px-6 py-4 flex flex-col items-center gap-2">
      <StatsMultiLineChart
        seriesList={seriesList}
        showBaseline={showBaseline}
        formatValue={formatValue}
      />
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setInfoOpen(true)}
          className="opacity-40 hover:opacity-70 transition-opacity"
        >
          <IconInfo size={13} />
        </button>
        <span className="text-[12px] font-medium uppercase tracking-wider opacity-50">
          {title}
        </span>
      </div>
      <InfoModal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={title}
        description={description}
      />
    </div>
  );
}
