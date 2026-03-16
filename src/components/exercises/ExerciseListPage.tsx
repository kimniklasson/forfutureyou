import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { IconPlus } from "../ui/icons";
import { useCategoryStore } from "../../stores/useCategoryStore";
import { useSessionStore } from "../../stores/useSessionStore";
import { ExerciseCard } from "./ExerciseCard";
import { AddExerciseModal } from "./AddExerciseModal";
import { EditExerciseModal } from "./EditExerciseModal";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useDragSort } from "../../hooks/useDragSort";
import type { Exercise } from "../../types/models";
import type { ExerciseFormData } from "./ExerciseFormFields";

export function ExerciseListPage() {
  const { id: categoryId } = useParams<{ id: string }>();
  const { categories, loadCategories, addExercise, updateExercise, deleteExercise, reorderExercises } =
    useCategoryStore();
  const { activeSession } = useSessionStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const category = categories.find((c) => c.id === categoryId);

  const { draggingId, displayItems, containerProps, getDragHandleProps, getItemProps } =
    useDragSort(
      category?.exercises ?? [],
      (newIds) => reorderExercises(categoryId!, newIds)
    );

  if (!category) {
    return <p className="text-center opacity-50 pt-10">Kategori hittades inte.</p>;
  }

  const isEmpty = category.exercises.length === 0;
  const sessionBlocked =
    activeSession !== null && activeSession.categoryId !== categoryId;

  const handleAddExercise = async (data: ExerciseFormData) => {
    await addExercise(category.id, {
      name: data.name,
      baseReps: data.baseReps,
      baseWeight: data.baseWeight,
      isBodyweight: data.isBodyweight,
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteExercise(categoryId!, deleteId);
      setDeleteId(null);
    }
  };

  const handleEditExercise = async (exerciseId: string, data: ExerciseFormData) => {
    await updateExercise(category.id, exerciseId, {
      name: data.name,
      baseReps: data.baseReps,
      baseWeight: data.baseWeight,
      isBodyweight: data.isBodyweight,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Category header */}
      <div className="flex items-center gap-6">
        <div className="flex-1 flex flex-col">
          <span className="font-bold text-[15px] leading-[1.22]">{category.name}</span>
          <span className="text-[15px] leading-[1.22] opacity-50">
            {isEmpty
              ? "Börja med att lägga till en övning genom att trycka på +."
              : "Lägg till de övningar du vill"}
          </span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0"
        >
          <IconPlus size={16} color="white" />
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
            onEdit={setEditingExercise}
            onDelete={setDeleteId}
            sessionBlocked={sessionBlocked}
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

      <AddExerciseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddExercise}
      />
      <EditExerciseModal
        isOpen={editingExercise !== null}
        exercise={editingExercise}
        onClose={() => setEditingExercise(null)}
        onSave={handleEditExercise}
      />
    </div>
  );
}
