/** A user-defined muscle group (e.g. "Bröst", "Triceps") */
export interface MuscleGroup {
  id: string;
  name: string;
  createdAt: string;
}

/** Assignment of a muscle group to an exercise with a percentage weight */
export interface MuscleGroupAssignment {
  muscleGroupId: string;
  muscleGroupName: string; // denormalized for display
  percentage: number; // 0–100, not normalized; if only 1 assignment implicitly 100%
}

export interface Exercise {
  id: string;
  name: string;
  baseReps: number;
  baseWeight: number;
  isBodyweight: boolean;
  muscleGroups: MuscleGroupAssignment[];
}

export interface CategoryExercise extends Exercise {
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  exercises: CategoryExercise[];
  createdAt: string;
  sortOrder: number;
  colorIndex: number;
}

export interface WorkoutSet {
  setNumber: number;
  reps: number;
  weight: number;
  startedAt?: string;
  completedAt: string;
}

export interface ActiveSetInfo {
  exerciseId: string;
  startedAt: string;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
  /** Snapshot of muscle group assignments at the time of logging */
  muscleGroups: Array<{ name: string; percentage: number }>;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  categoryId: string;
  categoryName: string;
  startedAt: string;
  finishedAt: string | null;
  pausedDuration: number;
  exerciseLogs: ExerciseLog[];
  status: "active" | "completed";
}

/** Temporary per-exercise adjustments during an active session */
export interface ExerciseAdjustment {
  exerciseId: string;
  currentReps: number;
  currentWeight: number;
}
