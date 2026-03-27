import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Exercise } from "../types/models";
import { getExerciseRepository } from "../data/repositories";

interface ExerciseState {
  exercises: Exercise[];
  loadExercises: () => Promise<void>;
  createExercise: (
    data: Pick<Exercise, "name" | "baseReps" | "baseWeight" | "isBodyweight" | "muscleGroups">
  ) => Promise<Exercise>;
  updateExercise: (
    id: string,
    data: Partial<Pick<Exercise, "name" | "baseReps" | "baseWeight" | "isBodyweight" | "muscleGroups">>
  ) => Promise<Exercise>;
  deleteExercise: (id: string) => Promise<void>;
  getExerciseById: (id: string) => Exercise | undefined;
  reset: () => void;
}

export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set, get) => ({
      exercises: [],

      loadExercises: async () => {
        const repo = getExerciseRepository();
        const exercises = await repo.getAll();
        set({ exercises });
      },

      createExercise: async (data) => {
        const repo = getExerciseRepository();
        const exercise = await repo.create(data);
        set((state) => ({ exercises: [...state.exercises, exercise] }));
        return exercise;
      },

      updateExercise: async (id, data) => {
        const repo = getExerciseRepository();
        const exercise = await repo.update(id, data);
        set((state) => ({
          exercises: state.exercises.map((e) => (e.id === id ? exercise : e)),
        }));
        return exercise;
      },

      deleteExercise: async (id) => {
        const repo = getExerciseRepository();
        await repo.delete(id);
        set((state) => ({
          exercises: state.exercises.filter((e) => e.id !== id),
        }));
      },

      getExerciseById: (id) => {
        return get().exercises.find((e) => e.id === id);
      },

      reset: () => {
        set({ exercises: [] });
      },
    }),
    {
      name: "workout-app:exercise-store",
      partialize: (state) => ({ exercises: state.exercises }),
    }
  )
);
