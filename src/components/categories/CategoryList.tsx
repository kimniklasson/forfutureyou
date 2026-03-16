import { useEffect, useState } from "react";
import { useCategoryStore } from "../../stores/useCategoryStore";
import { useSessionStore } from "../../stores/useSessionStore";
import { CategoryListItem } from "./CategoryListItem";
import { CreateCategoryInput } from "./CreateCategoryInput";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useDragSort } from "../../hooks/useDragSort";
import { useAuth } from "../../auth/useAuth";

export function CategoryList() {
  const { categories, loadCategories, deleteCategory, reorderCategories } = useCategoryStore();
  const activeSession = useSessionStore((s) => s.activeSession);
  const { displayName } = useAuth();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
    <div className="flex flex-col gap-10 items-center pt-[76px]">
      <div className="text-center text-[20px] leading-[1.22]">
        <p>Hej {displayName}!</p>
        <p>Vad har du gjort idag?</p>
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

      <ConfirmDialog
        isOpen={deleteId !== null}
        message="Är du säker på att du vill ta bort denna kategori?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
