import { Pencil, GripVertical, Trash2 } from "lucide-react";
import type { Exercise } from "../../types/models";
import { useSessionStore } from "../../stores/useSessionStore";
import { RepWeightAdjuster } from "./RepWeightAdjuster";
import { ExerciseSetDisplay } from "./ExerciseSetDisplay";

interface ExerciseCardProps {
  exercise: Exercise;
  categoryId: string;
  categoryName: string;
  onEdit: (exercise: Exercise) => void;
  onDelete: (id: string) => void;
  sessionBlocked: boolean;
  isDragging?: boolean;
  isDimmed?: boolean;
  dragHandleProps: React.HTMLAttributes<HTMLElement> & { style?: React.CSSProperties };
  itemProps: Record<string, string>;
}

export function ExerciseCard({
  exercise,
  categoryId,
  categoryName,
  onEdit,
  onDelete,
  sessionBlocked,
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

  const adjustment = getAdjustment(exercise.id, exercise.baseReps, exercise.baseWeight);
  const setCount = getExerciseSetCount(exercise.id);
  const isSessionActive = activeSession !== null;

  const exerciseLog = activeSession?.exerciseLogs.find(
    (l) => l.exerciseId === exercise.id
  );
  const hasCompletedSets = exerciseLog && exerciseLog.sets.length > 0;

  const handleSetPress = () => {
    if (sessionBlocked) {
      alert("Du har redan ett aktivt pass. Avsluta det först innan du startar ett nytt.");
      return;
    }
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
  };

  return (
    <div
      {...itemProps}
      className={[
        "bg-card rounded-card p-4 flex flex-col gap-3 animate-in select-none",
        hasCompletedSets ? "ring-2 ring-accent" : "",
        isDragging ? "shadow-xl scale-[1.01]" : "",
        isDimmed ? "opacity-40" : "opacity-100",
        "transition-opacity transition-shadow duration-150",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="flex items-center justify-center opacity-25 hover:opacity-60 transition-opacity shrink-0"
        >
          <GripVertical
            size={16}
            className={isDragging ? "cursor-grabbing" : "cursor-grab"}
          />
        </div>

        <button
          onClick={() => onEdit(exercise)}
          className="flex items-center flex-1 min-w-0 gap-0 text-left"
        >
          <span className="w-8 flex items-center justify-center opacity-50 shrink-0">
            <Pencil size={16} />
          </span>
          <span className="font-bold text-[15px] leading-[18px] truncate">
            {exercise.name}
          </span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(exercise.id);
          }}
          className="w-8 flex items-center justify-center opacity-50 shrink-0"
        >
          <Trash2 size={16} />
        </button>

        <button
          onClick={handleSetPress}
          className="bg-black text-white px-3 py-2 rounded-button text-[12px] font-bold uppercase tracking-wider shrink-0"
        >
          SET {setCount + 1}
        </button>
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

      {/* Completed sets */}
      {exerciseLog && (
        <ExerciseSetDisplay
          sets={exerciseLog.sets}
          isBodyweight={exercise.isBodyweight}
        />
      )}
    </div>
  );
}
