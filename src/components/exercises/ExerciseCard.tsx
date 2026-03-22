import { useState, useRef, useEffect } from "react";
import { IconDrag, IconCheck } from "../ui/icons";
import type { Exercise } from "../../types/models";
import { useSessionStore } from "../../stores/useSessionStore";
import { useExerciseStore } from "../../stores/useExerciseStore";
import { useCategoryStore } from "../../stores/useCategoryStore";
import { RepWeightAdjuster } from "./RepWeightAdjuster";
import { ExerciseSetDisplay } from "./ExerciseSetDisplay";
import { usePBTracker } from "../../hooks/usePBTracker";
import { firePBConfetti } from "../../utils/confetti";

interface ExerciseCardProps {
  exercise: Exercise;
  categoryId: string;
  categoryName: string;
  onRename: (id: string, name: string) => Promise<void>;
  sessionBlocked: boolean;
  isNew?: boolean;
  isDragging?: boolean;
  isDimmed?: boolean;
  dragHandleProps: React.HTMLAttributes<HTMLElement> & { style?: React.CSSProperties };
  itemProps: Record<string, string>;
}

export function ExerciseCard({
  exercise,
  categoryId,
  categoryName,
  onRename,
  sessionBlocked,
  isNew,
  isDragging,
  isDimmed,
  dragHandleProps,
  itemProps,
}: ExerciseCardProps) {
  const {
    activeSession,
    startSession,
    logSet,
    getAdjustment,
    setAdjustment,
    getExerciseSetCount,
  } = useSessionStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(exercise.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (!isEditingName) setEditName(exercise.name);
  }, [exercise.name, isEditingName]);

  const { updateExercise } = useExerciseStore();
  const { loadCategories } = useCategoryStore();
  const adjustment = getAdjustment(exercise.id, exercise.baseReps, exercise.baseWeight);
  const setCount = getExerciseSetCount(exercise.id);
  const isSessionActive = activeSession !== null;
  const { record, checkIfPB, pbSetNumbers } = usePBTracker(exercise.id);

  const hasPB = record.maxWeight > 0 || record.maxRepsBodyweight > 0;
  const pbLabel = exercise.isBodyweight
    ? record.maxWeight > 0
      ? `PB: ${record.maxRepsAtMaxWeight}×+${record.maxWeight} kg`
      : record.maxRepsBodyweight > 0
        ? `PB: ${record.maxRepsBodyweight} reps`
        : ""
    : `PB: ${record.maxRepsAtMaxWeight}×${record.maxWeight} kg`;

  const exerciseLog = activeSession?.exerciseLogs.find(
    (l) => l.exerciseId === exercise.id
  );
  const hasCompletedSets = exerciseLog && exerciseLog.sets.length > 0;

  const handleSetPress = () => {
    if (sessionBlocked) {
      alert("Du har redan ett aktivt pass. Avsluta det först innan du startar ett nytt.");
      return;
    }
    const willBePB = checkIfPB(adjustment.currentReps, adjustment.currentWeight);
    if (!isSessionActive) {
      startSession(categoryId, categoryName);
    }
    logSet(
      exercise.id,
      exercise.name,
      exercise.isBodyweight,
      adjustment.currentReps,
      adjustment.currentWeight
    );
    if (willBePB) {
      firePBConfetti();
    }
  };

  const handleNameBlur = async () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== exercise.name) {
      await onRename(exercise.id, trimmed);
    } else {
      setEditName(exercise.name);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") nameInputRef.current?.blur();
    if (e.key === "Escape") {
      setEditName(exercise.name);
      setIsEditingName(false);
    }
  };

  return (
    <div
      {...itemProps}
      className={[
        "bg-card rounded-card p-4 flex flex-col gap-3 select-none",
        isNew ? "animate-new-exercise" : "animate-in",
        hasCompletedSets ? "ring-2 ring-accent" : "",
        isDragging ? "shadow-xl scale-[1.01]" : "",
        isDimmed ? "opacity-40" : "opacity-100",
        "transition-opacity transition-shadow duration-150",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="w-8 h-8 flex items-center justify-center opacity-25 hover:opacity-60 transition-opacity shrink-0"
        >
          <IconDrag
            size={16}
            className={isDragging ? "cursor-grabbing" : "cursor-grab"}
          />
        </div>

        {/* Name — inline editable */}
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="w-full font-mono font-normal text-[15px] leading-[18px] uppercase bg-transparent outline-none border-b border-black/20 dark:border-white/20"
            />
          ) : (
            <span
              className="font-mono font-normal text-[15px] leading-[18px] uppercase truncate block cursor-text"
              onClick={() => setIsEditingName(true)}
            >
              {exercise.name}
            </span>
          )}
        </div>

        <div className="flex items-center shrink-0">
          <button
            onClick={handleSetPress}
            className="bg-black dark:bg-white text-white dark:text-black px-3 py-2 rounded-button text-[12px] font-bold uppercase tracking-wider shrink-0"
          >
            SET {setCount + 1}
          </button>
        </div>
      </div>

      {/* Adjusters */}
      <div className="flex flex-col gap-2">
        <RepWeightAdjuster
          value={adjustment.currentReps}
          label="rep"
          onChange={(val) => setAdjustment(exercise.id, val, adjustment.currentWeight)}
        />
        <RepWeightAdjuster
          value={adjustment.currentWeight}
          label="kg"
          isBodyweight={exercise.isBodyweight}
          step={exercise.isBodyweight ? 5 : 2.5}
          onChange={(val) => setAdjustment(exercise.id, adjustment.currentReps, val)}
        />
      </div>

      {/* PB + Bodyweight row */}
      <div className="flex items-center justify-between">
        {/* PB display — hidden when sets are logged */}
        <div className="flex-1 min-w-0">
          {!hasCompletedSets && hasPB && (
            <span className="text-[11px] opacity-40 truncate block">{pbLabel}</span>
          )}
        </div>

        {/* Bodyweight toggle */}
        <button
          onClick={async () => { await updateExercise(exercise.id, { isBodyweight: !exercise.isBodyweight }); await loadCategories(); }}
          className="flex items-center gap-1.5 shrink-0"
        >
          <span className="text-[11px] opacity-50">Kroppsvikt</span>
          <div
            className={`w-5 h-5 rounded-[4px] flex items-center justify-center ${
              exercise.isBodyweight
                ? "bg-black dark:bg-white"
                : "border-2 border-black/20 dark:border-white/20"
            }`}
          >
            {exercise.isBodyweight && (
              <IconCheck size={12} className="text-white dark:text-black" />
            )}
          </div>
        </button>
      </div>

      {/* Completed sets */}
      {exerciseLog && (
        <ExerciseSetDisplay
          sets={exerciseLog.sets}
          isBodyweight={exercise.isBodyweight}
          pbSetNumbers={pbSetNumbers}
        />
      )}
    </div>
  );
}
