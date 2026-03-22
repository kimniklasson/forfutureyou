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
}: CategoryListItemProps) {
  const navigate = useNavigate();

  return (
    <div
      {...itemProps}
      className={[
        "rounded-card select-none",
        isDragging ? "shadow-xl scale-[1.01]" : "",
        isDimmed ? "opacity-40" : "opacity-100",
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
            "bg-card rounded-card flex items-center px-4 py-6",
            hasActiveSession ? "border-2 border-accent" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <p
            className="flex-1 font-mono font-normal text-[15px] leading-[16px] uppercase cursor-pointer"
            onClick={() => !isDragging && navigate(`/category/${category.id}`)}
          >
            {category.name}
          </p>
        </div>
      </SwipeActions>
    </div>
  );
}
