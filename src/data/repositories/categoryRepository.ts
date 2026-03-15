import type { Category, Exercise } from "../../types/models";
import type { CategoryRepository } from "../types";
import { getItem, setItem } from "../storage";

const STORAGE_KEY = "categories";

function loadCategories(): Category[] {
  return getItem<Category[]>(STORAGE_KEY) ?? [];
}

function saveCategories(categories: Category[]): void {
  setItem(STORAGE_KEY, categories);
}

export const categoryRepository: CategoryRepository = {
  getAll() {
    return loadCategories()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((cat) => ({
        ...cat,
        exercises: [...cat.exercises].sort((a, b) => a.sortOrder - b.sortOrder),
      }));
  },

  getById(id: string) {
    return loadCategories().find((c) => c.id === id) ?? null;
  },

  create(name: string) {
    const categories = loadCategories();
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name,
      exercises: [],
      createdAt: new Date().toISOString(),
      sortOrder: categories.length,
    };
    categories.push(newCategory);
    saveCategories(categories);
    return newCategory;
  },

  update(id, data) {
    const categories = loadCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Category ${id} not found`);
    categories[index] = { ...categories[index], ...data };
    saveCategories(categories);
    return categories[index];
  },

  delete(id) {
    const categories = loadCategories().filter((c) => c.id !== id);
    saveCategories(categories);
  },

  addExercise(categoryId, data) {
    const categories = loadCategories();
    const category = categories.find((c) => c.id === categoryId);
    if (!category) throw new Error(`Category ${categoryId} not found`);

    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      categoryId,
      name: data.name,
      baseReps: data.baseReps,
      baseWeight: data.baseWeight,
      isBodyweight: data.isBodyweight,
      sortOrder: category.exercises.length,
    };
    category.exercises.push(newExercise);
    saveCategories(categories);
    return newExercise;
  },

  updateExercise(categoryId, exerciseId, data) {
    const categories = loadCategories();
    const category = categories.find((c) => c.id === categoryId);
    if (!category) throw new Error(`Category ${categoryId} not found`);

    const index = category.exercises.findIndex((e) => e.id === exerciseId);
    if (index === -1) throw new Error(`Exercise ${exerciseId} not found`);

    category.exercises[index] = { ...category.exercises[index], ...data };
    saveCategories(categories);
    return category.exercises[index];
  },

  deleteExercise(categoryId, exerciseId) {
    const categories = loadCategories();
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    category.exercises = category.exercises.filter((e) => e.id !== exerciseId);
    saveCategories(categories);
  },

  reorderCategories(orderedIds) {
    const categories = loadCategories();
    orderedIds.forEach((id, index) => {
      const cat = categories.find((c) => c.id === id);
      if (cat) cat.sortOrder = index;
    });
    saveCategories(categories);
  },

  reorderExercises(categoryId, orderedIds) {
    const categories = loadCategories();
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    orderedIds.forEach((id, index) => {
      const ex = category.exercises.find((e) => e.id === id);
      if (ex) ex.sortOrder = index;
    });
    saveCategories(categories);
  },
};
