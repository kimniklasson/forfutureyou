import type { WorkoutSet } from "../../types/models";

interface ExerciseSetDisplayProps {
  sets: WorkoutSet[];
  isBodyweight: boolean;
  pbSetNumbers?: Set<number>;
}

export function ExerciseSetDisplay({ sets, isBodyweight, pbSetNumbers }: ExerciseSetDisplayProps) {
  if (sets.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap text-[12px]">
      {sets.map((set) => {
        const weightDisplay = isBodyweight ? `+${set.weight}` : set.weight.toString();
        const isPB = pbSetNumbers?.has(set.setNumber) ?? false;
        return (
          <span
            key={set.setNumber}
            className={`bg-white dark:bg-black text-black dark:text-white px-2.5 py-0.5 rounded-full ${isPB ? "font-bold" : ""}`}
          >
            <span className="font-bold">S{set.setNumber}:</span>{" "}
            {set.reps}x{weightDisplay}
          </span>
        );
      })}
    </div>
  );
}
