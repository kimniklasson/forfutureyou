import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Appearance = "ljus" | "mörkt" | "auto";
export type WeightUnit = "kg" | "lbs";

interface SettingsState {
  appearance: Appearance;
  weightUnit: WeightUnit;
  setAppearance: (a: Appearance) => void;
  setWeightUnit: (u: WeightUnit) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: "auto",
      weightUnit: "kg",
      setAppearance: (appearance) => set({ appearance }),
      setWeightUnit: (weightUnit) => set({ weightUnit }),
    }),
    { name: "workout-app:settings-store" }
  )
);
