import { useNavigate } from "react-router-dom";
import type { WorkoutSession } from "../../types/models";
import { formatShortDate } from "../../utils/formatDate";
import { formatDuration } from "../../utils/formatTime";
import { SwipeActions } from "../ui/SwipeToDelete";

interface CompletedWorkoutItemProps {
  session: WorkoutSession;
  onDelete: (id: string) => void;
}

export function CompletedWorkoutItem({ session, onDelete }: CompletedWorkoutItemProps) {
  const navigate = useNavigate();

  const duration = session.finishedAt
    ? formatDuration(session.startedAt, session.finishedAt, session.pausedDuration)
    : "–";

  return (
    <SwipeActions
      onDelete={() => onDelete(session.id)}
      confirmMessage="Är du säker på att du vill ta bort detta träningspass?"
    >
      <div
        className="bg-card rounded-card p-6 flex flex-col gap-1 cursor-pointer animate-in"
        onClick={() => navigate(`/history/${session.id}`)}
      >
        <span className="font-bold text-[15px] leading-[18px]">
          {formatShortDate(session.startedAt)}
        </span>
        <span className="font-mono text-[15px] leading-[18px] uppercase">{session.categoryName}</span>
        <span className="text-[12px] opacity-50 uppercase tracking-wider">{duration}</span>
      </div>
    </SwipeActions>
  );
}
