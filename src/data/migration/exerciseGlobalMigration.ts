/**
 * Migrates localStorage data from the old format (exercises nested in categories)
 * to the new format (global exercises + category_exercises join table).
 *
 * This runs once on app startup and sets a flag so it doesn't run again.
 */

const MIGRATION_KEY = "workout-app:global-exercises-migration-done";
const CATEGORIES_KEY = "workout-app:categories";
const CATEGORY_STORE_KEY = "workout-app:category-store";
const GLOBAL_EXERCISES_KEY = "workout-app:global-exercises";
const JOIN_KEY = "workout-app:category-exercises";
const SESSION_KEY = "workout-app:session-store";

interface OldExercise {
  id: string;
  categoryId: string;
  name: string;
  baseReps: number;
  baseWeight: number;
  isBodyweight: boolean;
  sortOrder: number;
}

interface OldCategory {
  id: string;
  name: string;
  exercises: OldExercise[];
  createdAt: string;
  sortOrder: number;
}

interface GlobalExercise {
  id: string;
  name: string;
  baseReps: number;
  baseWeight: number;
  isBodyweight: boolean;
}

interface JoinEntry {
  categoryId: string;
  exerciseId: string;
  sortOrder: number;
}

export function runGlobalExerciseMigration(): void {
  if (localStorage.getItem(MIGRATION_KEY)) return;

  // Try zustand persisted store first, then raw key
  let categories: OldCategory[] = [];
  const rawStore = localStorage.getItem(CATEGORY_STORE_KEY);
  const rawCategories = localStorage.getItem(CATEGORIES_KEY);

  if (rawStore) {
    try {
      const store = JSON.parse(rawStore);
      categories = store?.state?.categories ?? [];
    } catch { /* ignore */ }
  } else if (rawCategories) {
    try {
      categories = JSON.parse(rawCategories);
    } catch { /* ignore */ }
  }

  if (categories.length === 0) {
    localStorage.setItem(MIGRATION_KEY, "true");
    return;
  }

  try {

    // Check if old format (exercises have categoryId)
    const hasOldFormat = categories.some(
      (c) => c.exercises?.length > 0 && "categoryId" in c.exercises[0]
    );

    if (!hasOldFormat) {
      // Already migrated or no exercises
      localStorage.setItem(MIGRATION_KEY, "true");
      return;
    }

    // Step 1: Deduplicate exercises by lowercase name
    const exerciseMap = new Map<string, { exercise: GlobalExercise; oldIds: string[] }>();

    for (const cat of categories) {
      for (const ex of cat.exercises || []) {
        const key = ex.name.trim().toLowerCase();
        if (!exerciseMap.has(key)) {
          const globalEx: GlobalExercise = {
            id: crypto.randomUUID(),
            name: ex.name,
            baseReps: ex.baseReps,
            baseWeight: ex.baseWeight,
            isBodyweight: ex.isBodyweight,
          };
          exerciseMap.set(key, { exercise: globalEx, oldIds: [ex.id] });
        } else {
          exerciseMap.get(key)!.oldIds.push(ex.id);
        }
      }
    }

    // Step 2: Build global exercises array
    const globalExercises = Array.from(exerciseMap.values()).map((e) => e.exercise);

    // Step 3: Build old-ID to new-ID mapping
    const idMapping = new Map<string, string>();
    for (const { exercise, oldIds } of exerciseMap.values()) {
      for (const oldId of oldIds) {
        idMapping.set(oldId, exercise.id);
      }
    }

    // Step 4: Build join entries
    const joinEntries: JoinEntry[] = [];
    for (const cat of categories) {
      for (const ex of cat.exercises || []) {
        const newId = idMapping.get(ex.id);
        if (newId) {
          // Avoid duplicate joins (same exercise in same category)
          if (!joinEntries.some((j) => j.categoryId === cat.id && j.exerciseId === newId)) {
            joinEntries.push({
              categoryId: cat.id,
              exerciseId: newId,
              sortOrder: ex.sortOrder,
            });
          }
        }
      }
    }

    // Step 5: Update session store to remap exercise IDs
    const rawSessionStore = localStorage.getItem(SESSION_KEY);
    if (rawSessionStore) {
      try {
        const sessionStore = JSON.parse(rawSessionStore);
        const state = sessionStore?.state;
        if (state?.activeSession) {
          for (const log of state.activeSession.exerciseLogs || []) {
            const newId = idMapping.get(log.exerciseId);
            if (newId) log.exerciseId = newId;
          }
          for (const adj of state.adjustments || []) {
            const newId = idMapping.get(adj.exerciseId);
            if (newId) adj.exerciseId = newId;
          }
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionStore));
      } catch {
        // Session migration failure is non-critical
      }
    }

    // Step 6: Strip exercises from categories (they'll come from join now)
    const cleanCategories = categories.map(({ exercises: _ex, ...rest }) => rest);

    // Step 7: Save everything
    localStorage.setItem(GLOBAL_EXERCISES_KEY, JSON.stringify(globalExercises));
    localStorage.setItem(JOIN_KEY, JSON.stringify(joinEntries));
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cleanCategories));

    // Also update the zustand persisted store so it doesn't overwrite on next hydration
    if (rawStore) {
      try {
        const store = JSON.parse(rawStore);
        if (store?.state?.categories) {
          store.state.categories = cleanCategories.map((c) => ({ ...c, exercises: [] }));
          localStorage.setItem(CATEGORY_STORE_KEY, JSON.stringify(store));
        }
      } catch { /* ignore */ }
    }

    localStorage.setItem(MIGRATION_KEY, "true");

    console.log(
      `[Migration] Migrated ${globalExercises.length} global exercises, ${joinEntries.length} category links`
    );
  } catch (error) {
    console.error("[Migration] Failed to migrate exercises:", error);
    // Don't set flag so it retries next time
  }
}
