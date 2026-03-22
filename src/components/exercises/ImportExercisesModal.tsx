import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useCategoryStore } from "../../stores/useCategoryStore";
import { IconClose, IconCheck } from "../ui/icons";
import type { Exercise } from "../../types/models";

interface ImportExercisesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  currentExerciseNames: Set<string>;
}

interface UniqueExercise {
  name: string;
  normalizedName: string;
  template: Pick<Exercise, "baseReps" | "baseWeight" | "isBodyweight">;
  alreadyInCategory: boolean;
}

export function ImportExercisesModal({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  currentExerciseNames,
}: ImportExercisesModalProps) {
  const { categories, addExercise, deleteExercise, reorderExercises } = useCategoryStore();
  // Track names the user has toggled ON (to add)
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());
  // Track names the user has toggled OFF (to remove from this category)
  const [removedNames, setRemovedNames] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Reset checked state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAddedNames(new Set());
      setRemovedNames(new Set());
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Collect all unique exercises across all categories
  const uniqueExercises: UniqueExercise[] = [];
  const seen = new Set<string>();

  for (const cat of categories) {
    for (const ex of cat.exercises) {
      const normalized = ex.name.trim().toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueExercises.push({
          name: ex.name,
          normalizedName: normalized,
          template: {
            baseReps: ex.baseReps,
            baseWeight: ex.baseWeight,
            isBodyweight: ex.isBodyweight,
          },
          alreadyInCategory: currentExerciseNames.has(normalized),
        });
      }
    }
  }

  uniqueExercises.sort((a, b) => a.name.localeCompare(b.name, "sv"));

  const toggleCheck = (normalizedName: string, alreadyInCategory: boolean) => {
    if (alreadyInCategory) {
      // Toggle removal of an existing exercise
      setRemovedNames((prev) => {
        const next = new Set(prev);
        if (next.has(normalizedName)) {
          next.delete(normalizedName);
        } else {
          next.add(normalizedName);
        }
        return next;
      });
    } else {
      // Toggle addition of a new exercise
      setAddedNames((prev) => {
        const next = new Set(prev);
        if (next.has(normalizedName)) {
          next.delete(normalizedName);
        } else {
          next.add(normalizedName);
        }
        return next;
      });
    }
  };

  const handleSave = async () => {
    if (addedNames.size === 0 && removedNames.size === 0) return;
    setSaving(true);

    // Add newly checked exercises
    const toAdd = uniqueExercises.filter(
      (e) => addedNames.has(e.normalizedName) && !e.alreadyInCategory
    );

    for (const ex of toAdd) {
      await addExercise(categoryId, {
        name: ex.name,
        ...ex.template,
      });
    }

    // Remove unchecked exercises from this category (not deleted globally)
    if (removedNames.size > 0) {
      const category = useCategoryStore
        .getState()
        .categories.find((c) => c.id === categoryId);
      if (category) {
        const exercisesToRemove = category.exercises.filter((e) =>
          removedNames.has(e.name.trim().toLowerCase())
        );
        for (const ex of exercisesToRemove) {
          await deleteExercise(categoryId, ex.id);
        }
      }
    }

    // Persist order
    const exercises =
      useCategoryStore
        .getState()
        .categories.find((c) => c.id === categoryId)?.exercises ?? [];
    reorderExercises(categoryId, exercises.map((e) => e.id));

    setSaving(false);
    onClose();
  };

  const hasChanges = addedNames.size > 0 || removedNames.size > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-70 flex flex-col justify-end modal-backdrop bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1c1c1e] rounded-t-modal max-h-[85vh] flex flex-col bottom-sheet-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-8 pt-4 pb-2 shrink-0 relative z-10 modal-header-fade"
          style={{
            paddingBottom: "32px",
            marginBottom: "-24px",
          }}
        >
          <span className="font-bold text-[15px] leading-[1.22]">
            Välj övningar till {categoryName}
          </span>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-icon"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto px-8 pb-4">
          <div className="flex flex-col gap-2">
            {uniqueExercises.length === 0 ? (
              <p className="text-center opacity-50 py-8 text-[15px]">
                Inga övningar att importera
              </p>
            ) : (
              uniqueExercises.map((ex) => {
                const isChecked = ex.alreadyInCategory
                  ? !removedNames.has(ex.normalizedName)
                  : addedNames.has(ex.normalizedName);

                return (
                  <button
                    key={ex.normalizedName}
                    onClick={() =>
                      toggleCheck(ex.normalizedName, ex.alreadyInCategory)
                    }
                    className="bg-card dark:bg-white/10 rounded-card px-4 py-3 flex items-center justify-between text-left"
                  >
                    <span className="text-[15px]">{ex.name}</span>
                    <div
                      className={`w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0 ${
                        isChecked
                          ? "bg-black dark:bg-white"
                          : "border-2 border-black/20 dark:border-white/20"
                      }`}
                    >
                      {isChecked && (
                        <IconCheck
                          size={12}
                          className="text-white dark:text-black"
                        />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Sticky footer — only visible when changes exist */}
        {hasChanges && (
          <div
            className="px-8 pb-8 shrink-0 modal-footer-fade"
            style={{
              paddingTop: "16px",
              marginTop: "-24px",
            }}
          >
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-card font-bold text-[15px] uppercase tracking-wider transition-colors bg-black dark:bg-white text-white dark:text-black"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
              ) : (
                "SPARA"
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
