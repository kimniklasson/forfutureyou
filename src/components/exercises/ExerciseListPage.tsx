import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useCategoryStore } from "../../stores/useCategoryStore";
import { useSessionStore } from "../../stores/useSessionStore";
import { ExerciseCard } from "./ExerciseCard";
import { SwipeActions } from "../ui/SwipeToDelete";
import { ImportExercisesModal } from "./ImportExercisesModal";
import { IconList } from "../ui/icons";
import { useDragSort } from "../../hooks/useDragSort";

export function ExerciseListPage() {
  const { id: categoryId } = useParams<{ id: string }>();
  const { categories, loadCategories, addExercise, updateExercise, deleteExercise, reorderExercises } =
    useCategoryStore();
  const { activeSession } = useSessionStore();

  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [newExerciseId, setNewExerciseId] = useState<string | null>(null);
  const [duplicateAfterId, setDuplicateAfterId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const tips = useMemo(() => [
    "Tryck på Set 1 för att starta session",
    "Tryck på ett värde för att ändra",
    "Svep åt vänster för att ta bort",
    "Svep åt höger för att duplicera",
  ], []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [tips]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const category = categories.find((c) => c.id === categoryId);

  // Put newly added exercise first (or after source if duplicating) for animation
  const exercisesForSort = (() => {
    const exs = category?.exercises ?? [];
    if (!newExerciseId) return exs;
    const newEx = exs.find((e) => e.id === newExerciseId);
    const rest = exs.filter((e) => e.id !== newExerciseId);
    if (!newEx) return exs;
    if (duplicateAfterId) {
      const afterIdx = rest.findIndex((e) => e.id === duplicateAfterId);
      if (afterIdx >= 0) {
        const result = [...rest];
        result.splice(afterIdx + 1, 0, newEx);
        return result;
      }
    }
    return [newEx, ...rest];
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
    // Exercise is already at top in local state (optimistic prepend in store).
    // Set newExerciseId immediately so animation fires on first render.
    setNewExerciseId(exercise.id);
    setNewName("");
    setSaving(false);
    inputRef.current?.focus();
    setTimeout(() => setNewExerciseId(null), 800);
    // Persist order to server in background (no await — don't block UI)
    const exercises = useCategoryStore.getState().categories.find((c) => c.id === categoryId)?.exercises ?? [];
    reorderExercises(categoryId!, exercises.map((e) => e.id));
  };

  const handleDuplicate = async (exerciseId: string) => {
    const exercise = category.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    const newExercise = await addExercise(category.id, {
      name: `${exercise.name} kopia`,
      baseReps: exercise.baseReps,
      baseWeight: exercise.baseWeight,
      isBodyweight: exercise.isBodyweight,
    });
    setNewExerciseId(newExercise.id);
    setDuplicateAfterId(exerciseId);
    setTimeout(() => {
      setNewExerciseId(null);
      setDuplicateAfterId(null);
    }, 800);
    // Persist correct order (new exercise after source)
    const storeExercises = useCategoryStore.getState().categories
      .find((c) => c.id === categoryId)?.exercises ?? [];
    const rest = storeExercises.filter((e) => e.id !== newExercise.id);
    const afterIdx = rest.findIndex((e) => e.id === exerciseId);
    const ordered = [...rest];
    if (afterIdx >= 0) ordered.splice(afterIdx + 1, 0, newExercise);
    reorderExercises(categoryId!, ordered.map((e) => e.id));
  };

  const handleRename = async (exerciseId: string, name: string) => {
    await updateExercise(category.id, exerciseId, { name });
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Category header */}
      <div className="flex flex-col items-center text-center">
        <span className="font-bold text-[20px] leading-[1.22]">{category.name}</span>
        <div className="text-[20px] leading-[1.22] opacity-50 relative">
          {/* Invisible spacer — tallest tip sets width */}
          <span className="invisible whitespace-nowrap">{tips[tipIndex]}</span>
          {tips.map((tip, i) => (
            <span
              key={tip}
              className="absolute inset-0 transition-opacity duration-700 whitespace-nowrap text-center"
              style={{ opacity: i === tipIndex ? 1 : 0 }}
            >
              {tip}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
      {/* Add exercise form + import button */}
      <div className="flex gap-2">
        <div className="flex-1 border border-black/10 dark:border-white/20 rounded-card flex items-center gap-2 pl-6 pr-4 py-4">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="Lägg till övning"
            className="flex-1 text-[15px] bg-transparent outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || saving}
            className={`px-3 py-2 rounded-button text-[12px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center shrink-0 min-w-[52px] ${
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
        <button
          onClick={() => setImportOpen(true)}
          className="bg-card rounded-card px-4 flex items-center justify-center shrink-0"
        >
          <IconList size={16} />
        </button>
      </div>

      {/* Exercise list */}
      <div {...containerProps} className="flex flex-col gap-2">
        {displayItems.map((exercise) => (
          <SwipeActions
            key={exercise.id}
            onDelete={() => deleteExercise(categoryId!, exercise.id)}
            onDuplicate={() => handleDuplicate(exercise.id)}
            confirmMessage={`Är du säker på att du vill ta bort ${exercise.name} från ${category.name}?`}
          >
            <ExerciseCard
              exercise={exercise}
              categoryId={category.id}
              categoryName={category.name}
              onRename={handleRename}
              sessionBlocked={sessionBlocked}
              isNew={exercise.id === newExerciseId}
              isDragging={draggingId === exercise.id}
              isDimmed={draggingId !== null && draggingId !== exercise.id}
              dragHandleProps={getDragHandleProps(exercise.id)}
              itemProps={getItemProps(exercise.id)}
            />
          </SwipeActions>
        ))}
      </div>
      </div>

      <ImportExercisesModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        categoryId={category.id}
        categoryName={category.name}
        currentExerciseNames={new Set(category.exercises.map((e) => e.name.trim().toLowerCase()))}
      />
    </div>
  );
}
