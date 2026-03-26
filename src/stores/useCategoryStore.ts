import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category } from "../types/models";
import { getCategoryRepository } from "../data/repositories";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Tilldela colorIndex från den separata kartan på kategorierna */
function applyColorIndices(
  categories: Category[],
  colorIndices: Record<string, number>
): Category[] {
  return categories.map((cat) => ({
    ...cat,
    colorIndex: colorIndices[cat.id] ?? 0,
  }));
}

/** Nästa lediga colorIndex som inte redan används */
function nextFreeIndex(colorIndices: Record<string, number>): number {
  const used = new Set(Object.values(colorIndices));
  let i = 0;
  while (used.has(i)) i++;
  return i;
}

/** Kör migration: tilldela indices till kategorier som saknar dem (bevarar sortOrder-ordning) */
function migrateColorIndices(
  categories: Category[],
  existing: Record<string, number>
): Record<string, number> {
  const result = { ...existing };
  const used = new Set(Object.values(result));
  let next = 0;
  // Sortera på sortOrder för att bevara nuvarande visuell ordning
  const unindexed = [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((c) => result[c.id] === undefined);
  for (const cat of unindexed) {
    while (used.has(next)) next++;
    result[cat.id] = next;
    used.add(next);
    next++;
  }
  return result;
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface CategoryState {
  categories: Category[];
  /** categoryId → colorIndex. Persisteras separat, skrivs aldrig över av loadCategories. */
  colorIndices: Record<string, number>;
  loadCategories: () => Promise<void>;
  createCategory: (name: string) => Promise<Category>;
  duplicateCategory: (id: string) => Promise<void>;
  renameCategory: (id: string, name: string) => Promise<void>;
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
      colorIndices: {},

      loadCategories: async () => {
        const repo = getCategoryRepository();
        const fetched = await repo.getAll();
        // Migrera saknade indices, skriv aldrig över befintliga
        const colorIndices = migrateColorIndices(fetched, get().colorIndices);
        const categories = applyColorIndices(fetched, colorIndices);
        set({ categories, colorIndices });
      },

      createCategory: async (name: string) => {
        const repo = getCategoryRepository();
        const category = await repo.create(name);
        const colorIndices = { ...get().colorIndices };
        colorIndices[category.id] = nextFreeIndex(colorIndices);
        const colored = { ...category, colorIndex: colorIndices[category.id] };
        set((state) => ({
          categories: [colored, ...state.categories],
          colorIndices,
        }));
        return colored;
      },

      renameCategory: async (id: string, name: string) => {
        const repo = getCategoryRepository();
        await repo.update(id, { name });
        const fetched = await repo.getAll();
        const colorIndices = migrateColorIndices(fetched, get().colorIndices);
        set({ categories: applyColorIndices(fetched, colorIndices), colorIndices });
      },

      duplicateCategory: async (id: string) => {
        const repo = getCategoryRepository();
        const original = get().categories.find((c) => c.id === id);
        if (!original) return;
        const newCategory = await repo.create(`${original.name} (kopia)`);
        for (const exercise of original.exercises) {
          await repo.addExerciseToCategory(newCategory.id, exercise.id);
        }
        const fetched = await repo.getAll();
        const colorIndices = { ...get().colorIndices };
        colorIndices[newCategory.id] = nextFreeIndex(colorIndices);
        const merged = migrateColorIndices(fetched, colorIndices);
        set({ categories: applyColorIndices(fetched, merged), colorIndices: merged });
      },

      deleteCategory: async (id: string) => {
        const repo = getCategoryRepository();
        await repo.delete(id);
        const fetched = await repo.getAll();
        const colorIndices = { ...get().colorIndices };
        delete colorIndices[id];
        const merged = migrateColorIndices(fetched, colorIndices);
        set({ categories: applyColorIndices(fetched, merged), colorIndices: merged });
      },

      addExerciseToCategory: async (categoryId, exerciseId) => {
        const repo = getCategoryRepository();
        await repo.addExerciseToCategory(categoryId, exerciseId);
        const fetched = await repo.getAll();
        const colorIndices = migrateColorIndices(fetched, get().colorIndices);
        set({ categories: applyColorIndices(fetched, colorIndices), colorIndices });
      },

      removeExerciseFromCategory: async (categoryId, exerciseId) => {
        const repo = getCategoryRepository();
        await repo.removeExerciseFromCategory(categoryId, exerciseId);
        const fetched = await repo.getAll();
        const colorIndices = migrateColorIndices(fetched, get().colorIndices);
        set({ categories: applyColorIndices(fetched, colorIndices), colorIndices });
      },

      getCategoryById: (id: string) => {
        return get().categories.find((c) => c.id === id);
      },

      reorderCategories: async (orderedIds) => {
        const repo = getCategoryRepository();
        await repo.reorderCategories(orderedIds);
        const fetched = await repo.getAll();
        const colorIndices = migrateColorIndices(fetched, get().colorIndices);
        set({ categories: applyColorIndices(fetched, colorIndices), colorIndices });
      },

      reorderExercises: async (categoryId, orderedIds) => {
        const repo = getCategoryRepository();
        await repo.reorderExercises(categoryId, orderedIds);
        const fetched = await repo.getAll();
        const colorIndices = migrateColorIndices(fetched, get().colorIndices);
        set({ categories: applyColorIndices(fetched, colorIndices), colorIndices });
      },

      reset: () => {
        set({ categories: [], colorIndices: {} });
      },
    }),
    {
      name: "workout-app:category-store",
      partialize: (state) => ({
        categories: state.categories,
        colorIndices: state.colorIndices,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Applicera sparade colorIndices på cachade kategorier direkt vid uppstart
        state.categories = applyColorIndices(
          state.categories,
          state.colorIndices ?? {}
        );
      },
    }
  )
);
