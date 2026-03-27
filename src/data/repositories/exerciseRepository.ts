import type { Exercise } from "../../types/models";
import type { ExerciseRepository } from "../types";
import { getItem, setItem } from "../storage";

const STORAGE_KEY = "global-exercises";

function loadExercises(): Exercise[] {
  const raw = getItem<Exercise[]>(STORAGE_KEY) ?? [];
  // Migration: backfill muscleGroups for exercises created before this feature
  return raw.map((e) => ({ ...e, muscleGroups: e.muscleGroups ?? [] }));
}

function saveExercises(exercises: Exercise[]): void {
  setItem(STORAGE_KEY, exercises);
}

export const exerciseRepository: ExerciseRepository = {
  async getAll() {
    return loadExercises().sort((a, b) => a.name.localeCompare(b.name, "sv"));
  },

  async create(data) {
    const exercises = loadExercises();
    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      name: data.name,
      baseReps: data.baseReps,
      baseWeight: data.baseWeight,
      isBodyweight: data.isBodyweight,
      muscleGroups: data.muscleGroups ?? [],
    };
    exercises.push(newExercise);
    saveExercises(exercises);
    return newExercise;
  },

  async update(id, data) {
    const exercises = loadExercises();
    const index = exercises.findIndex((e) => e.id === id);
    if (index === -1) throw new Error(`Exercise ${id} not found`);
    exercises[index] = { ...exercises[index], ...data };
    saveExercises(exercises);
    return exercises[index];
  },

  async delete(id) {
    const exercises = loadExercises().filter((e) => e.id !== id);
    saveExercises(exercises);
  },
};
