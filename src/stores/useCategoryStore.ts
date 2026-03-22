import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category } from "../types/models";
import { getCategoryRepository } from "../data/repositories";

interface CategoryState {
  categories: Category[];
  loadCategories: () => Promise<void>;
  createCategory: (name: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  addExerciseToCategory: (categoryId: string, exerciseId: string) => Promise<void>;
  removeExerciseFromCategory: (categoryId: string, exerciseId: string) => Promise<void>;
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
        set((state) => ({ categories: [category, ...state.categories] }));
        return category;
      },

      deleteCategory: async (id: string) => {
        const repo = getCategoryRepository();
        await repo.delete(id);
        const categories = await repo.getAll();
        set({ categories });
      },

      addExerciseToCategory: async (categoryId, exerciseId) => {
        const repo = getCategoryRepository();
        await repo.addExerciseToCategory(categoryId, exerciseId);
        const categories = await repo.getAll();
        set({ categories });
      },

      removeExerciseFromCategory: async (categoryId, exerciseId) => {
        const repo = getCategoryRepository();
        await repo.removeExerciseFromCategory(categoryId, exerciseId);
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
