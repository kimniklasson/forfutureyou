import type { Category, Exercise, WorkoutSession } from "../types/models";

export interface CategoryRepository {
  getAll(): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(name: string): Promise<Category>;
  update(id: string, data: Partial<Pick<Category, "name" | "sortOrder">>): Promise<Category>;
  delete(id: string): Promise<void>;
  addExercise(
    categoryId: string,
    data: Pick<Exercise, "name" | "baseReps" | "baseWeight" | "isBodyweight">
  ): Promise<Exercise>;
  updateExercise(
    categoryId: string,
    exerciseId: string,
    data: Partial<Pick<Exercise, "name" | "baseReps" | "baseWeight" | "isBodyweight">>
  ): Promise<Exercise>;
  deleteExercise(categoryId: string, exerciseId: string): Promise<void>;
  reorderCategories(orderedIds: string[]): Promise<void>;
  reorderExercises(categoryId: string, orderedIds: string[]): Promise<void>;
}

export interface SessionRepository {
  getAll(): Promise<WorkoutSession[]>;
  getById(id: string): Promise<WorkoutSession | null>;
  getActive(): Promise<WorkoutSession | null>;
  save(session: WorkoutSession): Promise<void>;
  delete(id: string): Promise<void>;
  /** Optional: deduplicate exercise_logs corrupted by race conditions */
  cleanup?(sessionId?: string): Promise<void>;
}
