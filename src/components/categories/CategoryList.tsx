import { useEffect, useState } from "react";
import { useCategoryStore } from "../../stores/useCategoryStore";
import { useSessionStore } from "../../stores/useSessionStore";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { CategoryListItem } from "./CategoryListItem";
import { CreateCategoryInput } from "./CreateCategoryInput";
import { ConfirmDialog } from "../ui/ConfirmDialog";
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
  const activeSession = useSessionStore((s) => s.activeSession);
  const { sessions, loadSessions } = useHistoryStore();
  useAuth();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
    loadSessions();
  }, [loadCategories, loadSessions]);

  const lastSession = sessions.length > 0 ? sessions[0] : null;
  const lastTrainedDate = lastSession?.finishedAt ?? lastSession?.startedAt;

  const { draggingId, displayItems, containerProps, getDragHandleProps, getItemProps } =
    useDragSort(categories, reorderCategories);

  const handleCategoryCreated = (id: string) => {
    setNewCategoryId(id);
    setTimeout(() => setNewCategoryId(null), 800);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      setExitingId(deleteId);
      setDeleteId(null);
      setTimeout(async () => {
        await deleteCategory(deleteId);
        setExitingId(null);
      }, 180);
    }
  };

  const isEmpty = categories.length === 0;

  return (
    <div className="flex flex-col gap-10 items-center">
      <div className="mb-10">
        <ForFutureYou />
      </div>

      <div className="w-full flex flex-col gap-6">
        <CreateCategoryInput onCreated={handleCategoryCreated} />

        {!isEmpty && (
          <div {...containerProps} className="flex flex-col gap-2">
            {displayItems.map((category) => (
              <CategoryListItem
                key={category.id}
                category={category}
                onDelete={setDeleteId}
                hasActiveSession={activeSession?.categoryId === category.id}
                isNew={category.id === newCategoryId}
                isExiting={exitingId === category.id}
                isDragging={draggingId === category.id}
                isDimmed={draggingId !== null && draggingId !== category.id}
                dragHandleProps={getDragHandleProps(category.id)}
                itemProps={getItemProps(category.id)}
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

      {lastTrainedDate && (
        <p className="text-[13px] opacity-40 text-center">
          Senaste träningen var {formatTimeSince(lastTrainedDate)} sedan
        </p>
      )}

      <ConfirmDialog
        isOpen={deleteId !== null}
        message="Är du säker på att du vill ta bort denna kategori?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
