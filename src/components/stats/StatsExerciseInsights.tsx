import type { ExerciseInsight } from "../../utils/statistics";

interface Props {
  insights: ExerciseInsight;
}

const CATEGORY_COLORS = [
  "#FFD900", "#6366f1", "#ef4444", "#22c55e", "#f97316", "#06b6d4",
  "#a855f7", "#ec4899", "#84cc16",
];

export function StatsExerciseInsights({ insights }: Props) {
  const totalSessions = insights.categoryBalance.reduce((sum, c) => sum + c.sessionCount, 0);

  return (
    <div className="flex flex-col gap-4">
      <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
        Övningsinsikter
      </span>

      <div className="flex flex-col gap-2">
        {/* Most trained */}
        {insights.mostTrainedExercise && (
          <InsightCard
            label="Mest tränad"
            value={insights.mostTrainedExercise.name}
            detail={`${insights.mostTrainedExercise.totalSets} set totalt`}
            delay={0}
          />
        )}

        {/* Most neglected */}
        {insights.mostNeglectedExercise && insights.mostNeglectedExercise.daysSinceLastLogged < Infinity && (
          <InsightCard
            label="Mest försummad"
            value={insights.mostNeglectedExercise.name}
            detail={`${insights.mostNeglectedExercise.daysSinceLastLogged} dagar sedan`}
            delay={1}
          />
        )}

        {/* Category balance */}
        {insights.categoryBalance.length > 0 && (
          <div
            className="bg-card rounded-card p-4 flex flex-col gap-3 animate-in"
            style={{ animationDelay: `${3 * 0.04}s` }}
          >
            <span className="text-[13px] opacity-50">Kategoribalans</span>

            {/* Stacked bar */}
            <div className="h-3 rounded-full overflow-hidden flex">
              {insights.categoryBalance.map((cat, i) => (
                <div
                  key={cat.categoryName}
                  style={{
                    width: `${(cat.sessionCount / totalSessions) * 100}%`,
                    backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                  }}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {insights.categoryBalance.map((cat, i) => (
                <div key={cat.categoryName} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                  />
                  <span className="text-[11px] opacity-70">
                    {cat.categoryName} ({cat.sessionCount})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InsightCard({ label, value, detail, delay }: {
  label: string; value: string; detail: string; delay: number;
}) {
  return (
    <div
      className="bg-card rounded-card p-4 animate-in"
      style={{ animationDelay: `${delay * 0.04}s` }}
    >
      <span className="text-[11px] opacity-50 uppercase tracking-wider">{label}</span>
      <div className="font-bold text-[15px] leading-[18px] mt-1">{value}</div>
      <div className="text-[12px] opacity-50 mt-0.5">{detail}</div>
    </div>
  );
}
