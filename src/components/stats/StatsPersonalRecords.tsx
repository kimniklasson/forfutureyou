import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ExercisePR } from "../../utils/statistics";

interface Props {
  prs: ExercisePR[];
}

export function StatsPersonalRecords({ prs }: Props) {
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();
  const displayPrs = showAll ? prs : prs.slice(0, 5);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
        Personliga rekord
      </span>

      {/* Exercise PR list */}
      <div className="flex flex-col gap-6">
        {displayPrs.map((pr, i) => (
          <button
            key={pr.exerciseId}
            onClick={() => navigate(`/stats/exercise/${pr.exerciseId}`)}
            className="bg-card rounded-card px-4 py-4 flex items-start gap-2 w-full text-left animate-in"
            style={{ animationDelay: `${(i + 3) * 0.04}s` }}
          >
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px] leading-[18px]">{pr.exerciseName}</div>
              <div className="text-[15px] leading-[18px] opacity-60">
                {pr.isBodyweight ? (
                  <>
                    {pr.maxRepsBodyweight} reps
                    {pr.maxWeight > 0 && ` · ${pr.maxWeight} kg extra`}
                  </>
                ) : (
                  <>
                    {pr.maxWeight} kg · {pr.maxRepsAtMaxWeight} reps
                  </>
                )}
              </div>
            </div>
            {!pr.isBodyweight && pr.estimated1RM > 0 && (
              <span className="text-[12px] opacity-50 uppercase tracking-wider shrink-0 pt-0.5">
                1RM: {pr.estimated1RM} kg
              </span>
            )}
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

