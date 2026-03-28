import { createContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { migrateLocalDataToSupabase } from "../data/migration/localToSupabase";
import { useCategoryStore } from "../stores/useCategoryStore";
import { useExerciseStore } from "../stores/useExerciseStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useHistoryStore } from "../stores/useHistoryStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { AUTH } from "../constants/ui-strings";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateName: (name: string) => Promise<{ error: string | null }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      await migrateLocalDataToSupabase();
      await Promise.all([
        useExerciseStore.getState().loadExercises(),
        useCategoryStore.getState().loadCategories(),
        useHistoryStore.getState().loadSessions(),
        useSettingsStore.getState().loadFromSupabase(),
      ]);
    } catch (e) {
      console.error("Failed to load data:", e);
    }
  }, []);

  useEffect(() => {
    // Listen for auth changes — also fires INITIAL_SESSION on startup
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Load data in the background — don't block the UI
        loadData();
      } else {
        useExerciseStore.getState().reset();
        useCategoryStore.getState().reset();
        useSessionStore.getState().reset();
        useHistoryStore.getState().reset();
        useSettingsStore.getState().reset();
      }

      setLoading(false);
    });

    // Safety timeout — if onAuthStateChange never fires, stop loading anyway
    const timeout = setTimeout(() => setLoading(false), 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [loadData]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateName = async (name: string) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: name },
    });
    if (data.user) setUser(data.user);
    return { error: error?.message ?? null };
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.email) return { error: AUTH.NO_USER_LOGGED_IN };
    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) return { error: AUTH.WRONG_CURRENT_PASSWORD };
    // Update to new password
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  };

  const deleteAccount = async () => {
    const userId = user?.id;
    if (!userId) return { error: AUTH.NO_USER_LOGGED_IN };

    try {
      // Delete all user data from tables (order matters for foreign keys)
      await supabase.from("workout_sets").delete().eq("user_id", userId);
      await supabase.from("exercise_logs").delete().eq("user_id", userId);
      await supabase.from("workout_sessions").delete().eq("user_id", userId);
      await supabase.from("exercise_muscle_groups").delete().match({});
      await supabase.from("category_exercises").delete().match({});
      await supabase.from("global_exercises").delete().eq("user_id", userId);
      await supabase.from("muscle_groups").delete().eq("user_id", userId);
      await supabase.from("categories").delete().eq("user_id", userId);

      // Try to delete the auth account via database function
      try {
        await supabase.rpc("delete_user_account");
      } catch {
        // RPC may not exist — data is already deleted above
      }
    } catch (e) {
      console.error("Failed to delete account data:", e);
      return { error: AUTH.COULD_NOT_DELETE_ACCOUNT };
    }

    // Only clear local storage AFTER successful DB deletion
    localStorage.removeItem("workout-app:category-store");
    localStorage.removeItem("workout-app:exercise-store");
    localStorage.removeItem("workout-app:session-store");
    localStorage.removeItem("workout-app:settings-store");
    localStorage.removeItem("workout-app:muscle-group-store");
    localStorage.removeItem("migration-done");

    await supabase.auth.signOut();
    return { error: null };
  };

  const displayName: string = user?.user_metadata?.display_name ?? "";

  return (
    <AuthContext.Provider
      value={{ user, session, loading, displayName, signUp, signIn, signInWithGoogle, signOut, updateName, updatePassword, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}
