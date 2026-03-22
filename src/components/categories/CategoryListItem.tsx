import { useNavigate } from "react-router-dom";
import type { Category } from "../../types/models";
import { SwipeActions } from "../ui/SwipeToDelete";

interface CategoryListItemProps {
  category: Category;
  onDelete: (id: string) => void;
  hasActiveSession?: boolean;
  isNew?: boolean;
  isExiting?: boolean;
  isDragging?: boolean;
  isDimmed?: boolean;
  itemProps: Record<string, unknown>;
  lastSessionDate?: string;
}

function formatLastSession(isoDate: string): string {
  const hours = Math.floor((Date.now() - new Date(isoDate).getTime()) / 3_600_000);
  if (hours < 72) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} ${days === 1 ? "dag" : "dagar"}`;
  const weeks = Math.floor(days / 7);
  return `${weeks} ${weeks === 1 ? "vecka" : "veckor"}`;
}

export function CategoryListItem({
  category,
  onDelete,
  hasActiveSession,
  isNew,
  isExiting,
  isDragging,
  isDimmed,
  itemProps,
  lastSessionDate,
}: CategoryListItemProps) {
  const navigate = useNavigate();
  const exerciseCount = category.exercises.length;
  const lastSessionLabel = lastSessionDate ? formatLastSession(lastSessionDate) : null;

  return (
    <div
      {...itemProps}
      className={[
        "rounded-card select-none",
        isDragging ? "shadow-xl scale-[1.01]" : "",
        isDimmed ? "opacity-60" : "opacity-100",
        isExiting ? "animate-out" : isNew ? "animate-new-exercise" : "animate-in",
        "transition-opacity transition-shadow duration-150",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <SwipeActions
        onDelete={() => onDelete(category.id)}
        confirmMessage={`Är du säker på att du vill ta bort kategorin "${category.name}"?`}
      >
        <div
          className={[
            "bg-card rounded-card flex items-start gap-2 px-4 py-4",
            hasActiveSession ? "border-2 border-accent" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* Name + exercise count */}
          <div
            className="flex-1 flex flex-col gap-0.5 cursor-pointer"
            onClick={() => !isDragging && navigate(`/category/${category.id}`)}
          >
            <p className="font-mono font-normal text-[15px] leading-[16px] uppercase">
              {category.name}
            </p>
            <span className="text-[11px] opacity-60">
              ({exerciseCount} {exerciseCount === 1 ? "övning" : "övningar"})
            </span>
          </div>

          {/* Time since last session */}
          {lastSessionLabel && (
            <span className="text-[11px] opacity-60 shrink-0 pt-0.5">
              {lastSessionLabel}
            </span>
          )}
        </div>
      </SwipeActions>
    </div>
  );
}
