import { useNavigate } from "react-router-dom";
import { IconTrash } from "../ui/icons";
import type { WorkoutSession } from "../../types/models";
import { formatShortDate } from "../../utils/formatDate";
import { formatDuration } from "../../utils/formatTime";

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
    <div
      className="bg-card rounded-card p-6 flex items-start gap-2 cursor-pointer"
      onClick={() => navigate(`/history/${session.id}`)}
    >
      <div className="flex-1 flex flex-col gap-1">
        <span className="font-bold text-[15px] leading-[18px]">
          {formatShortDate(session.startedAt)}
        </span>
        <span className="text-[15px] leading-[18px]">{session.categoryName}</span>
        <span className="text-[12px] opacity-50 uppercase tracking-wider">{duration}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.id);
        }}
        className="w-8 flex items-center justify-center pt-1"
      >
        <IconTrash size={16} />
      </button>
    </div>
  );
}
