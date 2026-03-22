import type { WorkoutSet } from "../../types/models";

interface ExerciseSetDisplayProps {
  sets: WorkoutSet[];
  isBodyweight: boolean;
  pbSetNumbers?: Set<number>;
}

export function ExerciseSetDisplay({ sets, isBodyweight, pbSetNumbers }: ExerciseSetDisplayProps) {
  if (sets.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap text-[12px]">
      {sets.map((set) => {
        const weightDisplay = isBodyweight ? `+${set.weight}` : set.weight.toString();
        const isPB = pbSetNumbers?.has(set.setNumber) ?? false;
        return (
          <span
            key={set.setNumber}
            className={`bg-black dark:bg-white text-white dark:text-black px-1.5 py-1 rounded-full ${isPB ? "font-bold" : ""}`}
          >
            <span className="font-bold">S{set.setNumber}:</span>{" "}
            {set.reps}x{weightDisplay}
          </span>
        );
      })}
    </div>
  );
}
