import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category, Exercise } from "../types/models";
import { getCategoryRepository } from "../data/repositories";

interface CategoryState {
  categories: Category[];
  loadCategories: () => Promise<void>;
  createCategory: (name: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  addExercise: (
    categoryId: string,
    data: Pick<Exercise, "name" | "baseReps" | "baseWeight" | "isBodyweight">
  ) => Promise<Exercise>;
  updateExercise: (
    categoryId: string,
    exerciseId: string,
    data: Partial<Pick<Exercise, "name" | "baseReps" | "baseWeight" | "isBodyweight">>
  ) => Promise<Exercise>;
  deleteExercise: (categoryId: string, exerciseId: string) => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  reorderCategories: (orderedIds: string[]) => Promise<void>;
  reorderExercises: (categoryId: string, orderedIds: string[]) => Promise<void>;
  reset: () => void;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: [],

      loadCategories: async () => {
        const repo = getCategoryRepository();
        const categories = await repo.getAll();
        set({ categories });
      },

      createCategory: async (name: string) => {
        const repo = getCategoryRepository();
        const category = await repo.create(name);
        // Optimistically prepend so item appears at top immediately
        set((state) => ({ categories: [category, ...state.categories] }));
        return category;
      },

      deleteCategory: async (id: string) => {
        const repo = getCategoryRepository();
        await repo.delete(id);
        const categories = await repo.getAll();
        set({ categories });
      },

      addExercise: async (categoryId, data) => {
        const repo = getCategoryRepository();
        const exercise = await repo.addExercise(categoryId, data);
        // Optimistically prepend so item appears at top immediately
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId
              ? { ...c, exercises: [exercise, ...c.exercises] }
              : c
          ),
        }));
        return exercise;
      },

      updateExercise: async (categoryId, exerciseId, data) => {
        const repo = getCategoryRepository();
        const exercise = await repo.updateExercise(categoryId, exerciseId, data);
        const categories = await repo.getAll();
        set({ categories });
        return exercise;
      },

      deleteExercise: async (categoryId, exerciseId) => {
        const repo = getCategoryRepository();
        await repo.deleteExercise(categoryId, exerciseId);
        const categories = await repo.getAll();
        set({ categories });
      },

      getCategoryById: (id: string) => {
        return get().categories.find((c) => c.id === id);
      },

      reorderCategories: async (orderedIds) => {
        const repo = getCategoryRepository();
        await repo.reorderCategories(orderedIds);
        const categories = await repo.getAll();
        set({ categories });
      },

      reorderExercises: async (categoryId, orderedIds) => {
        const repo = getCategoryRepository();
        await repo.reorderExercises(categoryId, orderedIds);
        const categories = await repo.getAll();
        set({ categories });
      },

      reset: () => {
        set({ categories: [] });
      },
    }),
    {
      name: "workout-app:category-store",
      partialize: (state) => ({ categories: state.categories }),
    }
  )
);
