import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ExercisePR } from "../../utils/statistics";
import { IconChevronRight } from "../ui/icons";

interface Props {
  prs: ExercisePR[];
}

export function StatsPersonalRecords({ prs }: Props) {
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();
  const displayPrs = showAll ? prs : prs.slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
        Personliga rekord
      </span>

      {/* Exercise PR list */}
      <div className="flex flex-col gap-2">
        {displayPrs.map((pr, i) => (
          <button
            key={pr.exerciseId}
            onClick={() => navigate(`/stats/exercise/${pr.exerciseId}`)}
            className="bg-card rounded-card p-4 flex items-center gap-3 w-full text-left animate-in"
            style={{ animationDelay: `${(i + 3) * 0.04}s` }}
          >
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px] leading-[18px]">{pr.exerciseName}</div>
              <div className="text-[13px] opacity-50 mt-1">
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
              </div>
            </div>
            <IconChevronRight size={16} className="opacity-30 shrink-0" />
          </button>
        ))}
      </div>

      {prs.length > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-[13px] font-bold opacity-50 py-2"
        >
          Visa alla ({prs.length})
        </button>
      )}
    </div>
  );
}

