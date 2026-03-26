import { useNavigate } from "react-router-dom";
import type { Category } from "../../types/models";
import { SwipeActions } from "../ui/SwipeToDelete";
import { getCategoryColor } from "../../utils/categoryColors";

interface CategoryListItemProps {
  category: Category;
  colorIndex: number;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
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
  colorIndex,
  onDelete,
  onDuplicate,
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
  const accentColor = getCategoryColor(colorIndex);

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
        onDuplicate={() => onDuplicate(category.id)}
        confirmMessage={`Är du säker på att du vill ta bort kategorin "${category.name}"?`}
      >
        <div
          className={[
            "bg-card rounded-card flex items-start gap-2 px-6 py-6 cursor-pointer",
            hasActiveSession ? "border-2 border-accent" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => !isDragging && navigate(`/category/${category.id}`)}
        >
          {/* Color accent border */}
          <div
            className="self-stretch rounded-full shrink-0"
            style={{ width: 4, backgroundColor: accentColor }}
          />

          {/* Name + exercise count */}
          <div className="flex-1 flex flex-col min-w-0" style={{ paddingLeft: 8 }}>
            <p className="font-bold text-[15px] leading-[18px]">
              {category.name}
            </p>
            <span className="text-[15px] leading-[18px] opacity-60">
              {exerciseCount} {exerciseCount === 1 ? "övning" : "övningar"}
            </span>
          </div>

          {/* Time since last session */}
          {lastSessionLabel && (
            <span className="text-[12px] opacity-50 uppercase tracking-wider shrink-0 pt-0.5">
              {lastSessionLabel}
            </span>
          )}
        </div>
      </SwipeActions>
    </div>
  );
}
