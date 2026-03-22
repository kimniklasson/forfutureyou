import type { Category, CategoryExercise, Exercise } from "../../types/models";
import type { CategoryRepository } from "../types";
import { getItem, setItem } from "../storage";

const CATEGORIES_KEY = "categories";
const EXERCISES_KEY = "global-exercises";
const JOIN_KEY = "category-exercises";

interface JoinEntry {
  categoryId: string;
  exerciseId: string;
  sortOrder: number;
}

function loadCategories(): Omit<Category, "exercises">[] {
  // Load raw categories (may still have old nested exercises from pre-migration)
  const raw = getItem<Category[]>(CATEGORIES_KEY) ?? [];
  return raw.map(({ exercises: _exercises, ...rest }) => rest);
}

function saveCategories(categories: Omit<Category, "exercises">[]): void {
  setItem(CATEGORIES_KEY, categories);
}

function loadExercises(): Exercise[] {
  return getItem<Exercise[]>(EXERCISES_KEY) ?? [];
}

function loadJoin(): JoinEntry[] {
  return getItem<JoinEntry[]>(JOIN_KEY) ?? [];
}

function saveJoin(entries: JoinEntry[]): void {
  setItem(JOIN_KEY, entries);
}

function buildCategory(
  cat: Omit<Category, "exercises">,
  exercises: Exercise[],
  joinEntries: JoinEntry[]
): Category {
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));
  const catJoins = joinEntries
    .filter((j) => j.categoryId === cat.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const categoryExercises: CategoryExercise[] = catJoins
    .map((j) => {
      const ex = exerciseMap.get(j.exerciseId);
      if (!ex) return null;
      return { ...ex, sortOrder: j.sortOrder };
    })
    .filter((e): e is CategoryExercise => e !== null);

  return { ...cat, exercises: categoryExercises };
}

export const categoryRepository: CategoryRepository = {
  async getAll() {
    const cats = loadCategories().sort((a, b) => a.sortOrder - b.sortOrder);
    const exercises = loadExercises();
    const joins = loadJoin();
    return cats.map((cat) => buildCategory(cat, exercises, joins));
  },

  async getById(id: string) {
    const cat = loadCategories().find((c) => c.id === id);
    if (!cat) return null;
    return buildCategory(cat, loadExercises(), loadJoin());
  },

  async create(name: string) {
    const categories = loadCategories();
    const newCategory: Omit<Category, "exercises"> = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      sortOrder: categories.length,
    };
    categories.push(newCategory);
    saveCategories(categories);
    return { ...newCategory, exercises: [] };
  },

  async update(id, data) {
    const categories = loadCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Category ${id} not found`);
    categories[index] = { ...categories[index], ...data };
    saveCategories(categories);
    return buildCategory(categories[index], loadExercises(), loadJoin());
  },

  async delete(id) {
    const categories = loadCategories().filter((c) => c.id !== id);
    saveCategories(categories);
    // Also remove join entries for this category
    const joins = loadJoin().filter((j) => j.categoryId !== id);
    saveJoin(joins);
  },

  async addExerciseToCategory(categoryId, exerciseId) {
    const joins = loadJoin();
    // Check if already exists
    if (joins.some((j) => j.categoryId === categoryId && j.exerciseId === exerciseId)) return;
    const maxSort = joins
      .filter((j) => j.categoryId === categoryId)
      .reduce((max, j) => Math.max(max, j.sortOrder), -1);
    joins.push({ categoryId, exerciseId, sortOrder: maxSort + 1 });
    saveJoin(joins);
  },

  async removeExerciseFromCategory(categoryId, exerciseId) {
    const joins = loadJoin().filter(
      (j) => !(j.categoryId === categoryId && j.exerciseId === exerciseId)
    );
    saveJoin(joins);
  },

  async reorderCategories(orderedIds) {
    const categories = loadCategories();
    orderedIds.forEach((id, index) => {
      const cat = categories.find((c) => c.id === id);
      if (cat) cat.sortOrder = index;
    });
    saveCategories(categories);
  },

  async reorderExercises(categoryId, orderedIds) {
    const joins = loadJoin();
    orderedIds.forEach((id, index) => {
      const entry = joins.find((j) => j.categoryId === categoryId && j.exerciseId === id);
      if (entry) entry.sortOrder = index;
    });
    saveJoin(joins);
  },
};
