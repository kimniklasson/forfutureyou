import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useCategoryStore } from "../../stores/useCategoryStore";
import { useSessionStore } from "../../stores/useSessionStore";
import { ExerciseCard } from "./ExerciseCard";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useDragSort } from "../../hooks/useDragSort";

export function ExerciseListPage() {
  const { id: categoryId } = useParams<{ id: string }>();
  const { categories, loadCategories, addExercise, updateExercise, deleteExercise, reorderExercises } =
    useCategoryStore();
  const { activeSession } = useSessionStore();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [newExerciseId, setNewExerciseId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const category = categories.find((c) => c.id === categoryId);

  // Put newly added exercise first for animation
  const exercisesForSort = (() => {
    const exs = category?.exercises ?? [];
    if (!newExerciseId) return exs;
    const newEx = exs.find((e) => e.id === newExerciseId);
    const rest = exs.filter((e) => e.id !== newExerciseId);
    return newEx ? [newEx, ...rest] : exs;
  })();

  const { draggingId, displayItems, containerProps, getDragHandleProps, getItemProps } =
    useDragSort(exercisesForSort, (newIds) => reorderExercises(categoryId!, newIds));

  if (!category) {
    return <p className="text-center opacity-50 pt-10">Kategori hittades inte.</p>;
  }

  const sessionBlocked =
    activeSession !== null && activeSession.categoryId !== categoryId;

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const exercise = await addExercise(category.id, {
      name,
      baseReps: 8,
      baseWeight: 50,
      isBodyweight: false,
    });
    setNewExerciseId(exercise.id);
    setNewName("");
    setSaving(false);
    setTimeout(() => setNewExerciseId(null), 800);
    inputRef.current?.focus();
  };

  const handleRename = async (exerciseId: string, name: string) => {
    await updateExercise(category.id, exerciseId, { name });
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteExercise(categoryId!, deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Category header */}
      <div className="flex items-center gap-6">
        <div className="flex-1 flex flex-col">
          <span className="font-bold text-[15px] leading-[1.22]">{category.name}</span>
          <span className="text-[15px] leading-[1.22] opacity-50">
            Lägg till de övningar du vill
          </span>
        </div>
      </div>

      {/* Add exercise form */}
      <div className="bg-card rounded-card flex items-center gap-2 pl-6 pr-2 py-2">
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Lägg till övning"
          className="flex-1 text-[15px] bg-transparent outline-none placeholder:opacity-30"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim() || saving}
          className={`px-4 py-3 rounded-button text-[12px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shrink-0 min-w-[72px] ${
            newName.trim() && !saving
              ? "bg-black dark:bg-white text-white dark:text-black"
              : "bg-black/5 dark:bg-white/10 text-black/30 dark:text-white/30"
          }`}
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            "Skapa"
          )}
        </button>
      </div>

      {/* Exercise list */}
      <div {...containerProps} className="flex flex-col gap-2">
        {displayItems.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            categoryId={category.id}
            categoryName={category.name}
            onRename={handleRename}
            onDelete={setDeleteId}
            sessionBlocked={sessionBlocked}
            isNew={exercise.id === newExerciseId}
            isDragging={draggingId === exercise.id}
            isDimmed={draggingId !== null && draggingId !== exercise.id}
            dragHandleProps={getDragHandleProps(exercise.id)}
            itemProps={getItemProps(exercise.id)}
          />
        ))}
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        message="Är du säker på att du vill ta bort denna övning?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
