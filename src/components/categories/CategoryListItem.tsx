import { useNavigate } from "react-router-dom";
import { IconTrash, IconDrag } from "../ui/icons";
import type { Category } from "../../types/models";

interface CategoryListItemProps {
  category: Category;
  onDelete: (id: string) => void;
  hasActiveSession?: boolean;
  isExiting?: boolean;
  isDragging?: boolean;
  isDimmed?: boolean;
  dragHandleProps: React.HTMLAttributes<HTMLElement> & { style?: React.CSSProperties };
  itemProps: Record<string, string>;
}

export function CategoryListItem({
  category,
  onDelete,
  hasActiveSession,
  isExiting,
  isDragging,
  isDimmed,
  dragHandleProps,
  itemProps,
}: CategoryListItemProps) {
  const navigate = useNavigate();

  return (
    <div
      {...itemProps}
      className={[
        "bg-card rounded-card flex items-center gap-2 pr-4 py-6 select-none",
        hasActiveSession ? "border-2 border-accent" : "",
        isDragging ? "shadow-xl scale-[1.01]" : "",
        isDimmed ? "opacity-40" : "opacity-100",
        isExiting ? "animate-out" : "animate-in",
        "transition-opacity transition-shadow duration-150",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className="pl-4 pr-1 self-stretch flex items-center justify-center opacity-25 hover:opacity-60 transition-opacity"
      >
        <IconDrag size={16} className={isDragging ? "cursor-grabbing" : "cursor-grab"} />
      </div>

      {/* Name — tap navigates */}
      <p
        className="flex-1 font-bold text-[15px] leading-[16px] cursor-pointer"
        onClick={() => !isDragging && navigate(`/category/${category.id}`)}
      >
        {category.name}
      </p>

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(category.id);
        }}
        className="w-8 h-full flex items-center justify-center"
      >
        <IconTrash size={16} />
      </button>
    </div>
  );
}
