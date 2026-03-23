import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../lib/supabase";

export type Appearance = "ljus" | "mörkt" | "auto";
export type Sex = "man" | "kvinna";

interface UserSettings {
  appearance: Appearance;
  userWeight: number;
  userAge: number;
  userSex: Sex | null;
  showCalories: boolean;
}

interface SettingsState extends UserSettings {
  setAppearance: (a: Appearance) => void;
  setUserWeight: (w: number) => void;
  setUserAge: (age: number) => void;
  setUserSex: (sex: Sex | null) => void;
  setShowCalories: (show: boolean) => void;
  /** Load settings from Supabase user_metadata */
  loadFromSupabase: () => Promise<void>;
  /** Reset to defaults (used on logout) */
  reset: () => void;
}

const DEFAULTS: UserSettings = {
  appearance: "auto",
  userWeight: 0,
  userAge: 0,
  userSex: null,
  showCalories: false,
};

/** Persist a single settings field to Supabase user_metadata (fire-and-forget). */
function syncToSupabase(patch: Partial<UserSettings>) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.user) return;
    const existing = session.user.user_metadata?.settings ?? {};
    supabase.auth.updateUser({
      data: { settings: { ...existing, ...patch } },
    });
  });
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      setAppearance: (appearance) => {
        set({ appearance });
        syncToSupabase({ appearance });
      },
      setUserWeight: (userWeight) => {
        set({ userWeight });
        syncToSupabase({ userWeight });
      },
      setUserAge: (userAge) => {
        set({ userAge });
        syncToSupabase({ userAge });
      },
      setUserSex: (userSex) => {
        set({ userSex });
        syncToSupabase({ userSex });
      },
      setShowCalories: (showCalories) => {
        set({ showCalories });
        syncToSupabase({ showCalories });
      },

      loadFromSupabase: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const remote: Partial<UserSettings> = user.user_metadata?.settings ?? {};
        const current = get();
        // Only overwrite fields that have non-default values on the server
        // OR where the local value is still default (server wins for fresh sessions)
        const merged: Partial<UserSettings> = {};
        if (remote.appearance !== undefined) merged.appearance = remote.appearance;
        if (remote.userWeight !== undefined && remote.userWeight > 0) merged.userWeight = remote.userWeight;
        if (remote.userAge !== undefined && remote.userAge > 0) merged.userAge = remote.userAge;
        if (remote.userSex !== undefined) merged.userSex = remote.userSex;
        if (remote.showCalories !== undefined) merged.showCalories = remote.showCalories;

        // If local has real values but remote doesn't, push local → remote (migration)
        const needsSync: Partial<UserSettings> = {};
        if (!remote.userWeight && current.userWeight > 0) needsSync.userWeight = current.userWeight;
        if (!remote.userAge && current.userAge > 0) needsSync.userAge = current.userAge;
        if (!remote.userSex && current.userSex) needsSync.userSex = current.userSex;
        if (!remote.showCalories && current.showCalories) needsSync.showCalories = current.showCalories;
        if (!remote.appearance && current.appearance !== "auto") needsSync.appearance = current.appearance;

        if (Object.keys(needsSync).length > 0) {
          syncToSupabase({ ...remote, ...needsSync });
        }

        if (Object.keys(merged).length > 0) {
          set(merged);
        }
      },

      reset: () => set(DEFAULTS),
    }),
    { name: "workout-app:settings-store" }
  )
);
