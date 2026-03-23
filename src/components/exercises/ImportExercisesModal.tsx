import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useExerciseStore } from "../../stores/useExerciseStore";
import { useCategoryStore } from "../../stores/useCategoryStore";
import { IconClose, IconTrash } from "../ui/icons";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface ImportExercisesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
}

export function ImportExercisesModal({
  isOpen,
  onClose,
  categoryId,
  categoryName,
}: ImportExercisesModalProps) {
  const { exercises, createExercise, deleteExercise, loadExercises } = useExerciseStore();
  const { categories, addExerciseToCategory, removeExerciseFromCategory, loadCategories } =
    useCategoryStore();

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Track pending changes: exerciseId → "add" | "remove"
  const [pendingChanges, setPendingChanges] = useState<Map<string, "add" | "remove">>(new Map());

  const inputRef = useRef<HTMLInputElement>(null);

  const category = categories.find((c) => c.id === categoryId);
  const currentExerciseIds = new Set(category?.exercises.map((e) => e.id) ?? []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 250);
  };

  useEffect(() => {
    if (isOpen) {
      setPendingChanges(new Map());
      setNewName("");
      setClosing(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isChecked = (exerciseId: string) => {
    const pending = pendingChanges.get(exerciseId);
    if (pending === "add") return true;
    if (pending === "remove") return false;
    return currentExerciseIds.has(exerciseId);
  };

  const toggleExercise = (exerciseId: string) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const inCategory = currentExerciseIds.has(exerciseId);
      const current = next.get(exerciseId);

      if (inCategory) {
        // Currently in category: toggle between remove and no-change
        if (current === "remove") {
          next.delete(exerciseId);
        } else {
          next.set(exerciseId, "remove");
        }
      } else {
        // Not in category: toggle between add and no-change
        if (current === "add") {
          next.delete(exerciseId);
        } else {
          next.set(exerciseId, "add");
        }
      }
      return next;
    });
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const exercise = await createExercise({
      name,
      baseReps: 8,
      baseWeight: 50,
      isBodyweight: false,
    });
    // Auto-check for current category
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(exercise.id, "add");
      return next;
    });
    setNewName("");
    setCreating(false);
    inputRef.current?.focus();
  };

  const handleSave = async () => {
    if (pendingChanges.size === 0) return;
    setSaving(true);

    for (const [exerciseId, action] of pendingChanges) {
      if (action === "add") {
        await addExerciseToCategory(categoryId, exerciseId);
      } else {
        await removeExerciseFromCategory(categoryId, exerciseId);
      }
    }

    await loadCategories();
    setSaving(false);
    handleClose();
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    // Remove pending changes for this exercise
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.delete(deleteTarget.id);
      return next;
    });
    await deleteExercise(deleteTarget.id);
    await loadCategories();
    await loadExercises();
    setDeleteTarget(null);
  };

  const hasChanges = pendingChanges.size > 0;
  const sortedExercises = [...exercises].sort((a, b) => a.name.localeCompare(b.name, "sv"));

  return createPortal(
    <div
      className={`fixed inset-0 z-70 flex flex-col justify-end bg-black/40 transition-opacity duration-250 ${closing ? "opacity-0" : "modal-backdrop"}`}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-card rounded-t-modal max-h-[85vh] flex flex-col ${closing ? "bottom-sheet-out" : "bottom-sheet-in"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-10 pt-6 pb-4 shrink-0">
          <span className="font-bold text-[15px] leading-[1.22]">
            Välj övningar till {categoryName}
          </span>
          <button
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-icon"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto px-10 pb-4">
          {/* Create new exercise input */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 border border-black/10 dark:border-white/20 rounded-card flex items-center gap-2 pl-4 pr-3 py-3">
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                placeholder="Lägg till övning"
                className="flex-1 text-[15px] bg-transparent outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className={`px-4 py-2 rounded-button text-[12px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center shrink-0 min-w-[52px] ${
                  newName.trim() && !creating
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "bg-black/5 dark:bg-white/10 text-black/30 dark:text-white/30"
                }`}
              >
                {creating ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Skapa"
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {sortedExercises.length === 0 ? (
              <p className="text-center opacity-50 py-8 text-[15px]">
                Inga övningar skapade ännu
              </p>
            ) : (
              sortedExercises.map((ex) => {
                const checked = isChecked(ex.id);

                return (
                  <div
                    key={ex.id}
                    className={`bg-card dark:bg-white/10 rounded-card px-4 py-3 flex items-center gap-3 transition-all ${
                      checked
                        ? "border-2 border-black dark:border-white"
                        : "border-2 border-transparent"
                    }`}
                  >
                    {/* Exercise name — tap to toggle category membership */}
                    <button
                      onClick={() => toggleExercise(ex.id)}
                      className="flex-1 text-left"
                    >
                      <span className="text-[15px]">{ex.name}</span>
                    </button>

                    {/* Permanent delete */}
                    <button
                      onClick={() => setDeleteTarget({ id: ex.id, name: ex.name })}
                      className="w-8 h-8 flex items-center justify-center opacity-40 hover:opacity-60 transition-opacity shrink-0"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sticky footer — only visible when changes exist */}
        {hasChanges && (
          <div
            className="px-10 pb-8 shrink-0 modal-footer-fade"
            style={{
              paddingTop: "16px",
              marginTop: "-24px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-button font-bold text-[15px] uppercase tracking-wider transition-colors bg-black dark:bg-white text-white dark:text-black"
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

      {/* Permanent delete confirmation */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        message={`Vill du permanent radera ${deleteTarget?.name ?? ""}? Övningen tas bort från alla kategorier.`}
        cancelLabel="Avbryt"
        confirmLabel="Radera"
        onConfirm={handlePermanentDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>,
    document.body
  );
}
