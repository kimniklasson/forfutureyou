import { useEffect, useState, useMemo } from "react";
import { useCategoryStore } from "../../stores/useCategoryStore";
import { useExerciseStore } from "../../stores/useExerciseStore";
import { useSessionStore } from "../../stores/useSessionStore";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { CategoryListItem } from "./CategoryListItem";
import { CreateCategoryInput } from "./CreateCategoryInput";
import { ForFutureYou } from "../ui/ForFutureYou";
import { useDragSort } from "../../hooks/useDragSort";
import { useAuth } from "../../auth/useAuth";

function formatTimeSince(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (weeks >= 1) {
    const remainingDays = days - weeks * 7;
    return remainingDays > 0
      ? `${weeks} ${weeks === 1 ? "vecka" : "veckor"} och ${remainingDays} ${remainingDays === 1 ? "dag" : "dagar"}`
      : `${weeks} ${weeks === 1 ? "vecka" : "veckor"}`;
  }

  if (days >= 1) {
    const remainingHours = hours - days * 24;
    return remainingHours > 0
      ? `${days} ${days === 1 ? "dag" : "dagar"} och ${remainingHours} ${remainingHours === 1 ? "timme" : "timmar"}`
      : `${days} ${days === 1 ? "dag" : "dagar"}`;
  }

  if (hours >= 1) {
    return `${hours} ${hours === 1 ? "timme" : "timmar"}`;
  }

  return "mindre än en timme";
}

export function CategoryList() {
  const { categories, loadCategories, deleteCategory, reorderCategories } = useCategoryStore();
  const { loadExercises } = useExerciseStore();
  const activeSession = useSessionStore((s) => s.activeSession);
  const { sessions, loadSessions } = useHistoryStore();
  const { displayName } = useAuth();
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);

  useEffect(() => {
    loadExercises();
    loadCategories();
    loadSessions();
  }, [loadExercises, loadCategories, loadSessions]);

  const lastSession = sessions.length > 0 ? sessions[0] : null;
  const lastTrainedDate = lastSession?.finishedAt ?? lastSession?.startedAt;

  // Map categoryId → ISO date of most recent completed session
  const lastSessionByCategory = useMemo(() => {
    const map = new Map<string, string>();
    for (const session of sessions) {
      if (session.status !== "completed") continue;
      const date = session.finishedAt ?? session.startedAt;
      const existing = map.get(session.categoryId);
      if (!existing || date > existing) map.set(session.categoryId, date);
    }
    return map;
  }, [sessions]);

  const { draggingId, displayItems, containerProps, getItemProps } =
    useDragSort(categories, reorderCategories);

  const handleCategoryCreated = (id: string) => {
    setNewCategoryId(id);
    setTimeout(() => setNewCategoryId(null), 800);
  };

  const handleDelete = (id: string) => {
    setExitingId(id);
    setTimeout(async () => {
      await deleteCategory(id);
      setExitingId(null);
    }, 180);
  };

  const isEmpty = categories.length === 0;

  return (
    <div className="flex flex-col gap-10 items-center">
      <div className="mb-6">
        <ForFutureYou />
      </div>

      <div className="w-full flex flex-col gap-2">
        <CreateCategoryInput onCreated={handleCategoryCreated} />

        {!isEmpty && (
          <div {...containerProps} className="flex flex-col gap-2">
            {displayItems.map((category) => (
              <CategoryListItem
                key={category.id}
                category={category}
                onDelete={handleDelete}
                hasActiveSession={activeSession?.categoryId === category.id}
                isNew={category.id === newCategoryId}
                isExiting={exitingId === category.id}
                isDragging={draggingId === category.id}
                isDimmed={draggingId !== null && draggingId !== category.id}
                itemProps={getItemProps(category.id)}
                lastSessionDate={lastSessionByCategory.get(category.id)}
              />
            ))}
          </div>
        )}

        {isEmpty && (
          <p className="text-[15px] leading-[18px] opacity-50">
            Börja med att skapa en kategori, t.ex. &ldquo;Bröst och triceps&rdquo; och
            tryck på Skapa. Du kan skapa hur många kategorier du vill.
          </p>
        )}
      </div>

      {lastTrainedDate && (() => {
        const daysSince = (Date.now() - new Date(lastTrainedDate).getTime()) / 86_400_000;
        const firstName = displayName?.split(" ")[0] ?? "";
        const motivation =
          daysSince < 4
            ? `Starkt jobbat${firstName ? ` ${firstName}` : ""}!`
            : daysSince < 14
            ? `Kom igen nu${firstName ? ` ${firstName}` : ""}!`
            : `Dags att ta tag i det${firstName ? ` ${firstName}` : ""}!`;
        return (
          <div className="flex flex-col gap-1 text-center">
            <p className="text-[15px] font-bold">{motivation}</p>
            <p className="text-[15px]">
              Senaste träningen var {formatTimeSince(lastTrainedDate)} sedan
            </p>
          </div>
        );
      })()}

    </div>
  );
}
