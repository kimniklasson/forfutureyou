import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Appearance = "ljus" | "mörkt" | "auto";

interface SettingsState {
  appearance: Appearance;
  userWeight: number;
  setAppearance: (a: Appearance) => void;
  setUserWeight: (w: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: "auto",
      userWeight: 0,
      setAppearance: (appearance) => set({ appearance }),
      setUserWeight: (userWeight) => set({ userWeight }),
    }),
    { name: "workout-app:settings-store" }
  )
);
