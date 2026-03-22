import { createContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { migrateLocalDataToSupabase } from "../data/migration/localToSupabase";
import { useCategoryStore } from "../stores/useCategoryStore";
import { useExerciseStore } from "../stores/useExerciseStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useHistoryStore } from "../stores/useHistoryStore";

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
      await useExerciseStore.getState().loadExercises();
      await useCategoryStore.getState().loadCategories();
      await useHistoryStore.getState().loadSessions();
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

  const deleteAccount = async () => {
    const userId = user?.id;
    if (!userId) return { error: "Ingen användare inloggad." };

    try {
      // Delete all user data from tables (order matters for foreign keys)
      await supabase.from("workout_sets").delete().eq("user_id", userId);
      await supabase.from("exercise_logs").delete().eq("user_id", userId);
      await supabase.from("workout_sessions").delete().eq("user_id", userId);
      await supabase.from("exercises").delete().eq("user_id", userId);
      await supabase.from("categories").delete().eq("user_id", userId);

      // Try to delete the auth account via database function
      await supabase.rpc("delete_user_account");
    } catch {
      // If the RPC doesn't exist, data is still deleted — sign out gracefully
    }

    // Clear local storage
    localStorage.removeItem("workout-app:category-store");
    localStorage.removeItem("workout-app:session-store");
    localStorage.removeItem("migration-done");

    await supabase.auth.signOut();
    return { error: null };
  };

  const displayName: string = user?.user_metadata?.display_name ?? "";

  return (
    <AuthContext.Provider
      value={{ user, session, loading, displayName, signUp, signIn, signInWithGoogle, signOut, updateName, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}
