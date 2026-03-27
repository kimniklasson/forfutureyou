import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { IconCheck } from "../ui/icons";
import { Modal } from "../ui/Modal";
import type { Exercise, MuscleGroupAssignment } from "../../types/models";
import { useSessionStore } from "../../stores/useSessionStore";
import { useExerciseStore } from "../../stores/useExerciseStore";
import { useCategoryStore } from "../../stores/useCategoryStore";
import { MuscleGroupPicker } from "./MuscleGroupPicker";
import { RepWeightAdjuster } from "./RepWeightAdjuster";
import { ExerciseSetDisplay } from "./ExerciseSetDisplay";
import { usePBTracker } from "../../hooks/usePBTracker";
import { firePBConfetti } from "../../utils/confetti";
import { useRestTimer } from "../../hooks/useRestTimer";

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M10.6338 0.25L11.0938 2.55566L13.4375 1.88574L16.0371 6.38867L14.2129 7.99902L16.0371 9.61133L13.4375 14.1143L11.0938 13.4434L10.6338 15.75H5.40332L4.94238 13.4434L2.59961 14.1143L0 9.61133L1.82324 7.99902L0 6.38867L2.59961 1.88574L4.94238 2.55566L5.40332 0.25H10.6338ZM6.25391 3.64746L5.3125 4.2207L3.3125 3.64844L1.91113 6.07617L3.45215 7.43652L3.45312 8.56055L1.91113 9.92285L3.3125 12.3506L5.3125 11.7793L6.25391 12.3525L6.63379 14.25H9.40332L9.7832 12.3525L10.7246 11.7793L12.7236 12.3506L14.125 9.92285L12.584 8.56055L12.585 7.43652L14.125 6.07617L12.7236 3.64844L10.7246 4.2207L9.7832 3.64746L9.40332 1.75H6.63379L6.25391 3.64746Z" fill="currentColor"/>
      <path d="M9.26855 8C9.26855 7.30964 8.70891 6.75 8.01855 6.75C7.3282 6.75 6.76855 7.30964 6.76855 8C6.76855 8.69036 7.3282 9.25 8.01855 9.25C8.70891 9.25 9.26855 8.69036 9.26855 8ZM10.7686 8C10.7686 9.51878 9.53734 10.75 8.01855 10.75C6.49977 10.75 5.26855 9.51878 5.26855 8C5.26855 6.48122 6.49977 5.25 8.01855 5.25C9.53734 5.25 10.7686 6.48122 10.7686 8Z" fill="currentColor"/>
    </svg>
  );
}

interface ExerciseCardProps {
  exercise: Exercise;
  categoryId: string;
  categoryName: string;
  onRename: (id: string, name: string) => Promise<void>;
  sessionBlocked: boolean;
  isNew?: boolean;
}

export function ExerciseCard({
  exercise,
  categoryId,
  categoryName,
  onRename,
  sessionBlocked,
  isNew,
}: ExerciseCardProps) {
  const {
    activeSession,
    startSession,
    startSet,
    logSet,
    getAdjustment,
    setAdjustment,
    getExerciseSetCount,
    activeSet,
    lastCompletedSetAt,
  } = useSessionStore();

  const restElapsed = useRestTimer();

  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState(exercise.name);
  const [saving, setSaving] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupAssignment[]>(exercise.muscleGroups);

  useEffect(() => {
    if (!showSettings) {
      setEditName(exercise.name);
      setMuscleGroups(exercise.muscleGroups);
    }
  }, [exercise.name, exercise.muscleGroups, showSettings]);

  const { updateExercise } = useExerciseStore();
  const { loadCategories } = useCategoryStore();
  const adjustment = getAdjustment(exercise.id, exercise.baseReps, exercise.baseWeight);
  const setCount = getExerciseSetCount(exercise.id);
  const isSessionActive = activeSession !== null;
  const { record, checkIfPB, pbSetNumbers } = usePBTracker(exercise.id);

  const isSetInProgress = activeSet?.exerciseId === exercise.id;

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
  const isLastLogged = !!lastCompletedSetAt && exerciseLog?.sets.at(-1)?.completedAt === lastCompletedSetAt;

  const handleSetPress = () => {
    if (sessionBlocked) {
      alert("Du har redan ett aktivt pass. Avsluta det först innan du startar ett nytt.");
      return;
    }

    if (isSetInProgress) {
      // TAP 2: Log the set
      const willBePB = checkIfPB(adjustment.currentReps, adjustment.currentWeight);
      logSet(
        exercise.id,
        exercise.name,
        exercise.isBodyweight,
        exercise.muscleGroups.map((mg) => ({ name: mg.muscleGroupName, percentage: mg.percentage })),
        adjustment.currentReps,
        adjustment.currentWeight
      );
      if (willBePB) {
        firePBConfetti();
      }
    } else {
      // TAP 1: Start the set
      if (!isSessionActive) {
        startSession(categoryId, categoryName);
      }
      startSet(exercise.id);
    }
  };

  const nameHasChanged = editName.trim() !== exercise.name && editName.trim().length > 0;
  const muscleGroupsChanged = JSON.stringify(muscleGroups) !== JSON.stringify(exercise.muscleGroups);
  const hasChanges = nameHasChanged || muscleGroupsChanged;

  const handleSave = async () => {
    setShowSettings(false);
    setSaving(true);
    if (nameHasChanged) {
      await onRename(exercise.id, editName.trim());
    }
    setSaving(false);
  };

  const handleBodyweightToggle = async () => {
    await updateExercise(exercise.id, { isBodyweight: !exercise.isBodyweight });
    await loadCategories();
  };

  const handleMuscleGroupsChange = async (assignments: MuscleGroupAssignment[]) => {
    setMuscleGroups(assignments);
    await updateExercise(exercise.id, { muscleGroups: assignments });
  };

  const settingsModal = createPortal(
    <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Inställningar">
      <div className="flex flex-col gap-2">
        {/* Name field */}
        <div className="border border-black/10 dark:border-white/20 rounded-card flex items-center gap-2 pl-6 pr-4 py-4">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            maxLength={60}
            placeholder="Namn"
            className="flex-1 min-w-0 text-[15px] bg-transparent outline-none"
          />
        </div>

        {/* Bodyweight toggle */}
        <button
          onClick={handleBodyweightToggle}
          className="w-full border border-black/10 dark:border-white/20 rounded-card flex items-center px-6 py-4"
        >
          <span className="flex-1 text-left text-[15px]">Kroppsvikt</span>
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

        {/* Muscle groups */}
        <div className="mt-4">
          <MuscleGroupPicker value={muscleGroups} onChange={handleMuscleGroupsChange} />
        </div>

        {/* Save button */}
        {hasChanges && (
          <button
            onClick={handleSave}
            className="mt-4 w-full py-4 px-6 rounded-button text-[12px] font-bold uppercase tracking-wider bg-black dark:bg-white text-white dark:text-black transition-transform active:scale-[0.97]"
          >
            Spara
          </button>
        )}
      </div>
    </Modal>,
    document.body
  );

  return (
    <>
      <div
        onClick={handleSetPress}
        className={[
          "bg-card rounded-card p-4 flex flex-col select-none cursor-pointer",
          isNew ? "animate-new-exercise" : "animate-in",
          "ring-2",
          isSetInProgress ? "ring-black dark:ring-white" : hasCompletedSets ? "ring-accent" : "ring-transparent",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Header row */}
        <div className="flex items-center">
          {/* Settings icon */}
          <button
            onClick={(e) => { e.stopPropagation(); if (!saving) setShowSettings(true); }}
            className="shrink-0 opacity-40 active:opacity-70 w-8 h-8 flex items-center justify-center"
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <SettingsIcon />
            }
          </button>

          {/* Name — read only */}
          <div className="flex-1 min-w-0">
            <span className="font-bold text-[15px] leading-[18px] truncate block">
              {exercise.name}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {hasPB && (
              <span className="text-[12px] opacity-50 whitespace-nowrap">{pbLabel}</span>
            )}
            <button
              className={`w-12 h-8 flex items-center justify-center rounded-button text-[12px] font-bold uppercase tracking-wider shrink-0 transition-colors border ${
                isSetInProgress
                  ? "bg-black dark:bg-white text-white dark:text-black border-transparent"
                  : "border-transparent bg-accent text-black"
              }`}
            >
              {isSetInProgress ? <IconCheck size={16} /> : `S${setCount + 1}`}
            </button>
          </div>
        </div>

        {/* Adjusters */}
        <div className="flex flex-row gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          <RepWeightAdjuster
            value={adjustment.currentReps}
            label="rep"
            isActive={isSetInProgress || hasCompletedSets}
            onChange={(val) => setAdjustment(exercise.id, val, adjustment.currentWeight)}
          />
          <RepWeightAdjuster
            value={adjustment.currentWeight}
            label="kg"
            isBodyweight={exercise.isBodyweight}
            isActive={isSetInProgress || hasCompletedSets}
            step={exercise.isBodyweight ? 5 : 2.5}
            onChange={(val) => setAdjustment(exercise.id, adjustment.currentReps, val)}
          />
        </div>

        {/* Completed sets (left) + PB (right) — animated reveal, always 16px below adjusters */}
        <div className={`grid transition-all duration-300 ease-in-out ${hasCompletedSets ? "grid-rows-[1fr] mt-4" : "grid-rows-[0fr] mt-0"}`}>
          <div className="overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <ExerciseSetDisplay
                  sets={exerciseLog?.sets ?? []}
                  isBodyweight={exercise.isBodyweight}
                  pbSetNumbers={pbSetNumbers}
                />
              </div>
              {isLastLogged && restElapsed > 0 && (
                <span className="text-[12px] font-bold shrink-0 ml-2 tabular-nums bg-black dark:bg-white text-white dark:text-black px-2.5 py-0.5 rounded-full">
                  {String(Math.floor(restElapsed / 60000)).padStart(2, "0")}:{String(Math.floor((restElapsed % 60000) / 1000)).padStart(2, "0")}.{String(Math.floor((restElapsed % 1000) / 10)).padStart(2, "0")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {settingsModal}
    </>
  );
}
