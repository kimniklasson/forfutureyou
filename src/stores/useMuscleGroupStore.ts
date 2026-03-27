import { create } from "zustand";
import type { MuscleGroup } from "../types/models";
import { getMuscleGroupRepository } from "../data/repositories";

interface MuscleGroupState {
  muscleGroups: MuscleGroup[];
  loadMuscleGroups: () => Promise<void>;
  createMuscleGroup: (name: string) => Promise<MuscleGroup>;
  renameMuscleGroup: (id: string, newName: string) => Promise<void>;
  deleteMuscleGroup: (id: string) => Promise<void>;
  reset: () => void;
}

export const useMuscleGroupStore = create<MuscleGroupState>()((set) => ({
  muscleGroups: [],

  loadMuscleGroups: async () => {
    const repo = getMuscleGroupRepository();
    const muscleGroups = await repo.getAll();
    set({ muscleGroups });
  },

  createMuscleGroup: async (name: string) => {
    const repo = getMuscleGroupRepository();
    const muscleGroup = await repo.create(name);
    set((state) => ({
      muscleGroups: [...state.muscleGroups, muscleGroup].sort((a, b) =>
        a.name.localeCompare(b.name, "sv")
      ),
    }));
    return muscleGroup;
  },

  renameMuscleGroup: async (id: string, newName: string) => {
    const repo = getMuscleGroupRepository();
    const updated = await repo.update(id, newName);
    set((state) => ({
      muscleGroups: state.muscleGroups
        .map((g) => (g.id === id ? updated : g))
        .sort((a, b) => a.name.localeCompare(b.name, "sv")),
    }));
  },

  deleteMuscleGroup: async (id: string) => {
    const repo = getMuscleGroupRepository();
    await repo.delete(id);
    set((state) => ({
      muscleGroups: state.muscleGroups.filter((g) => g.id !== id),
    }));
  },

  reset: () => {
    set({ muscleGroups: [] });
  },
}));
