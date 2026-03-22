import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useCategoryStore } from "../../stores/useCategoryStore";
import { useExerciseStore } from "../../stores/useExerciseStore";
import { useSessionStore } from "../../stores/useSessionStore";
import { ExerciseCard } from "./ExerciseCard";
import { SwipeActions } from "../ui/SwipeToDelete";
import { ImportExercisesModal } from "./ImportExercisesModal";
import { useDragSort } from "../../hooks/useDragSort";

export function ExerciseListPage() {
  const { id: categoryId } = useParams<{ id: string }>();
  const { categories, loadCategories, removeExerciseFromCategory, reorderExercises } =
    useCategoryStore();
  const { loadExercises } = useExerciseStore();
  const { activeSession } = useSessionStore();

  const [newExerciseId, setNewExerciseId] = useState<string | null>(null);
  const [duplicateAfterId, setDuplicateAfterId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

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
    loadExercises();
    loadCategories();
  }, [loadExercises, loadCategories]);

  // Listen for "+" button in header
  useEffect(() => {
    const handler = () => setImportOpen(true);
    window.addEventListener("open-exercise-modal", handler);
    return () => window.removeEventListener("open-exercise-modal", handler);
  }, []);

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

  const handleDuplicate = async (exerciseId: string) => {
    const exercise = category.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;

    // Create a copy as a new global exercise, then add to category
    const { createExercise } = useExerciseStore.getState();
    const { addExerciseToCategory } = useCategoryStore.getState();

    const newExercise = await createExercise({
      name: `${exercise.name} kopia`,
      baseReps: exercise.baseReps,
      baseWeight: exercise.baseWeight,
      isBodyweight: exercise.isBodyweight,
    });
    await addExerciseToCategory(category.id, newExercise.id);

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
    await useExerciseStore.getState().updateExercise(exerciseId, { name });
    await loadCategories(); // Refresh to get updated names
  };

  const handleRemoveFromCategory = async (exerciseId: string) => {
    await removeExerciseFromCategory(categoryId!, exerciseId);
  };

  const isEmpty = category.exercises.length === 0;

  return (
    <div className="flex flex-col gap-10">
      {/* Category header */}
      <div className="flex flex-col items-center text-center">
        <span className="font-bold text-[20px] leading-[1.22]">{category.name}</span>
        {!isEmpty && (
          <div className="text-[20px] leading-[1.22] opacity-50 relative">
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
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center gap-4 pt-8">
          <p className="text-[15px] opacity-50 text-center leading-relaxed">
            Inga övningar ännu.<br />
            Tryck på <span className="font-bold">+</span> uppe till höger för att lägga till.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div {...containerProps} className="flex flex-col gap-2">
            {displayItems.map((exercise) => (
              <SwipeActions
                key={exercise.id}
                onDelete={() => handleRemoveFromCategory(exercise.id)}
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
      )}

      <ImportExercisesModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        categoryId={category.id}
        categoryName={category.name}
      />
    </div>
  );
}
