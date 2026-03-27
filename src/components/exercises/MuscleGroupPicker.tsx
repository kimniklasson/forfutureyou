import { useState, useEffect, useRef } from "react";
import type { MuscleGroupAssignment } from "../../types/models";
import { useMuscleGroupStore } from "../../stores/useMuscleGroupStore";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { IconTrash } from "../ui/icons";

interface MuscleGroupPickerProps {
  value: MuscleGroupAssignment[];
  onChange: (v: MuscleGroupAssignment[]) => void;
}

function MinusIcon() {
  return (
    <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
      <path d="M1 1H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}



export function MuscleGroupPicker({ value, onChange }: MuscleGroupPickerProps) {
  const { muscleGroups, loadMuscleGroups, createMuscleGroup, renameMuscleGroup, deleteMuscleGroup } =
    useMuscleGroupStore();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteIdState] = useState<string | null>(null);
  // Keep a ref in sync so the mousedown handler always sees the latest value
  const syncConfirmDeleteId = (id: string | null) => { confirmDeleteIdRef.current = id; setConfirmDeleteIdState(id); };

  const createInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const addContainerRef = useRef<HTMLDivElement>(null);
  const confirmDeleteIdRef = useRef<string | null>(null);

  useEffect(() => { loadMuscleGroups(); }, [loadMuscleGroups]);

  useEffect(() => {
    if (editingId) {
      setTimeout(() => { editInputRef.current?.focus(); editInputRef.current?.select(); }, 50);
    }
  }, [editingId]);


  useEffect(() => {
    if (!showAdd) return;
    function handleClick(e: MouseEvent) {
      if (addContainerRef.current && !addContainerRef.current.contains(e.target as Node) && confirmDeleteIdRef.current === null) {
        setShowAdd(false);
        setNewName("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAdd]);

  const availableGroups = muscleGroups.filter((g) => {
    const notAdded = !value.some((v) => v.muscleGroupId === g.id);
    const matches = newName.trim() === "" || g.name.toLowerCase().includes(newName.toLowerCase());
    return notAdded && matches;
  });

  const hasExactMatch = muscleGroups.some(
    (g) => g.name.toLowerCase() === newName.trim().toLowerCase()
  );
  const canCreate = newName.trim().length > 0 && !hasExactMatch;

  function redistributeWith(assignments: MuscleGroupAssignment[], targetTotal: number): MuscleGroupAssignment[] {
    const total = assignments.reduce((acc, v) => acc + v.percentage, 0);
    if (total === 0) {
      const each = Math.floor(targetTotal / assignments.length);
      return assignments.map((v, i) => ({
        ...v,
        percentage: i === 0 ? targetTotal - each * (assignments.length - 1) : each,
      }));
    }
    const scaled = assignments.map((v) => ({ ...v, percentage: Math.round((v.percentage / total) * targetTotal) }));
    const sum = scaled.reduce((acc, v) => acc + v.percentage, 0);
    if (sum !== targetTotal) scaled[0] = { ...scaled[0], percentage: scaled[0].percentage + (targetTotal - sum) };
    return scaled;
  }

  function handleAddGroup(id: string, name: string) {
    if (value.length === 0) {
      onChange([{ muscleGroupId: id, muscleGroupName: name, percentage: 100 }]);
    } else {
      const newPct = 20;
      const rescaled = redistributeWith(value, 100 - newPct);
      onChange([...rescaled, { muscleGroupId: id, muscleGroupName: name, percentage: newPct }]);
    }
    setShowAdd(false);
    setNewName("");
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name || hasExactMatch) return;
    try {
      const newGroup = await createMuscleGroup(name);
      handleAddGroup(newGroup.id, newGroup.name);
    } catch {
      const existing = muscleGroups.find((g) => g.name.toLowerCase() === name.toLowerCase());
      if (existing) handleAddGroup(existing.id, existing.name);
    }
  }

  function handleRemoveFromExercise(id: string) {
    const remaining = value.filter((v) => v.muscleGroupId !== id);
    if (remaining.length === 0) { onChange([]); return; }
    onChange(redistributeWith(remaining, 100));
  }

  function handleStep(id: string, delta: number) {
    const current = value.find((v) => v.muscleGroupId === id);
    if (!current) return;
    const newVal = Math.max(0, Math.min(100, current.percentage + delta));
    const others = value.filter((v) => v.muscleGroupId !== id);
    const rescaledOthers = redistributeWith(others, 100 - newVal);
    onChange(value.map((v) =>
      v.muscleGroupId === id
        ? { ...v, percentage: newVal }
        : rescaledOthers.find((o) => o.muscleGroupId === v.muscleGroupId) || v
    ));
  }

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditingName(name);
  }

  async function commitEdit() {
    if (!editingId || !editingName.trim()) { setEditingId(null); return; }
    try {
      await renameMuscleGroup(editingId, editingName.trim());
      onChange(value.map((v) =>
        v.muscleGroupId === editingId ? { ...v, muscleGroupName: editingName.trim() } : v
      ));
    } catch { /* ignore name conflict */ }
    setEditingId(null);
  }

  async function handleDeleteGlobally() {
    if (!confirmDeleteId) return;
    await deleteMuscleGroup(confirmDeleteId);
    const remaining = value.filter((v) => v.muscleGroupId !== confirmDeleteId);
    onChange(remaining.length === 0 ? [] : redistributeWith(remaining, 100));
    setEditingId(null);
    syncConfirmDeleteId(null);
  }

  const multiMode = value.length >= 2;

  return (
    <div className="flex flex-col gap-2">
      <label className="font-bold text-[12px] uppercase tracking-wider opacity-50">
        Muskelgrupper
      </label>

      {/* Assigned groups */}
      {value.length > 0 && (
        <div
          className={
            multiMode
              ? "border border-black/10 dark:border-white/20 rounded-card divide-y divide-black/5 dark:divide-white/10"
              : "flex flex-col gap-2"
          }
        >
          {value.map((assignment) => {
            const isEditing = editingId === assignment.muscleGroupId;

            return (
              <div key={assignment.muscleGroupId} className="relative">
                <div
                  className={
                    multiMode
                      ? "pt-4 pr-4 pb-4 pl-6"
                      : "border border-black/10 dark:border-white/20 rounded-card pt-4 pr-4 pb-4 pl-6"
                  }
                >
                  <div className="flex items-center gap-3">
                    {/* Name / edit input */}
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="bg-transparent outline-none text-[15px] font-bold flex-1 min-w-0"
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(assignment.muscleGroupId, assignment.muscleGroupName)}
                        className="text-[15px] font-bold flex-1 text-left truncate"
                      >
                        {assignment.muscleGroupName}
                      </button>
                    )}

                    {/* +/- stepper — multiMode only */}
                    {multiMode && (
                      <div
                        className="flex items-center shrink-0 bg-[#f5f5f5] dark:bg-white/10 rounded-[4px]"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleStep(assignment.muscleGroupId, -10)}
                          className="w-[34px] h-[34px] flex items-center justify-center text-[14px] font-bold transition-transform active:scale-90 leading-none"
                        >
                          −
                        </button>
                        <span className="text-[13px] font-bold tabular-nums w-[34px] text-center">
                          {assignment.percentage}%
                        </span>
                        <button
                          onClick={() => handleStep(assignment.muscleGroupId, 10)}
                          className="w-[34px] h-[34px] flex items-center justify-center text-[14px] font-bold transition-transform active:scale-90 leading-none"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Minus badge — overlapping right border, remove from exercise */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromExercise(assignment.muscleGroupId);
                  }}
                  className="absolute right-[-8px] top-[29px] -translate-y-1/2 w-4 h-4 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center z-10 transition-transform active:scale-90"
                >
                  <MinusIcon />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state — dashed button */}
      {value.length === 0 && !showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="border border-dashed border-black/20 dark:border-white/20 rounded-card px-6 py-4 w-full flex items-center gap-3 text-black/40 dark:text-white/40 transition-transform active:scale-[0.93]"
        >
          <span className="text-[15px]">Lägg till muskelgrupp</span>
        </button>
      )}

      {/* Small "+ Lägg till" — when groups exist */}
      {value.length > 0 && !showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="self-start text-[12px] font-bold uppercase tracking-wider opacity-50 transition-transform active:scale-[0.93] flex items-center gap-1.5 mt-2"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Lägg till muskelgrupp
        </button>
      )}

      {/* Add panel */}
      {showAdd && (
        <div ref={addContainerRef} className="flex flex-col gap-2">
          {/* Create new input with existing group pills inside */}
          <div className="border border-black/10 dark:border-white/20 rounded-card p-4 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <input
                ref={createInputRef}
                type="text"
                autoFocus
                placeholder="Skapa ny muskelgrupp..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCreate) handleCreate();
                  if (e.key === "Escape") { setShowAdd(false); setNewName(""); }
                }}
                className="flex-1 min-w-0 text-[15px] bg-transparent outline-none ml-2"
              />
              {canCreate && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
                  className="text-[12px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-button bg-black dark:bg-white text-white dark:text-black transition-transform active:scale-[0.93] shrink-0"
                >
                  Skapa
                </button>
              )}
            </div>
            {/* Existing group pills */}
            {availableGroups.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {availableGroups.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center gap-3 pl-3 pr-[6px] py-[6px]"
                  >
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleAddGroup(g.id, g.name); }}
                      className="text-[15px] font-medium leading-none"
                    >
                      {g.name}
                    </button>
                    <button
                      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); syncConfirmDeleteId(g.id); }}
                      className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0 transition-transform active:scale-90"
                    >
                      <IconTrash size={11} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        message="Ta bort muskelgruppen permanent? Den tas bort från alla övningar."
        confirmLabel="Ta bort"
        cancelLabel="Avbryt"
        onConfirm={handleDeleteGlobally}
        onCancel={() => { syncConfirmDeleteId(null); setEditingId(null); }}
      />
    </div>
  );
}
