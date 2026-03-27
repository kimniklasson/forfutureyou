import type { MuscleGroup } from "../../types/models";
import type { MuscleGroupRepository } from "../types";
import { getItem, setItem } from "../storage";

const STORAGE_KEY = "muscle-groups";

function loadMuscleGroups(): MuscleGroup[] {
  return getItem<MuscleGroup[]>(STORAGE_KEY) ?? [];
}

function saveMuscleGroups(groups: MuscleGroup[]): void {
  setItem(STORAGE_KEY, groups);
}

export const muscleGroupRepository: MuscleGroupRepository = {
  async getAll() {
    return loadMuscleGroups().sort((a, b) => a.name.localeCompare(b.name, "sv"));
  },

  async create(name: string) {
    const groups = loadMuscleGroups();
    const normalized = name.trim().toLowerCase();
    if (groups.some((g) => g.name.toLowerCase() === normalized)) {
      throw new Error(`Muskelgrupp med namnet "${name}" finns redan`);
    }
    const newGroup: MuscleGroup = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    groups.push(newGroup);
    saveMuscleGroups(groups);
    return newGroup;
  },

  async update(id: string, name: string) {
    const groups = loadMuscleGroups();
    const index = groups.findIndex((g) => g.id === id);
    if (index === -1) throw new Error(`Muskelgrupp ${id} hittades inte`);
    const normalized = name.trim().toLowerCase();
    if (groups.some((g) => g.id !== id && g.name.toLowerCase() === normalized)) {
      throw new Error(`Muskelgrupp med namnet "${name}" finns redan`);
    }
    groups[index] = { ...groups[index], name: name.trim() };
    saveMuscleGroups(groups);
    return groups[index];
  },

  async delete(id: string) {
    const groups = loadMuscleGroups().filter((g) => g.id !== id);
    saveMuscleGroups(groups);
  },
};
