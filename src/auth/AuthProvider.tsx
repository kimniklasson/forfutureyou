import { createContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { migrateLocalDataToSupabase } from "../data/migration/localToSupabase";
import { useCategoryStore } from "../stores/useCategoryStore";
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
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadStores = useCallback(async () => {
    await useCategoryStore.getState().loadCategories();
    await useHistoryStore.getState().loadSessions();
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          await migrateLocalDataToSupabase();
          await reloadStores();
        } catch (e) {
          console.error("Failed to initialise data:", e);
        }
      }
      setLoading(false);
    }).catch(() => {
      // Supabase call itself failed — ensure we still stop loading
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          await migrateLocalDataToSupabase();
          await reloadStores();
        } catch (e) {
          console.error("Failed to reload data:", e);
        }
      } else {
        // User signed out — reset stores
        useCategoryStore.getState().reset();
        useSessionStore.getState().reset();
        useHistoryStore.getState().reset();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [reloadStores]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
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

  const displayName: string = user?.user_metadata?.display_name ?? "";

  return (
    <AuthContext.Provider
      value={{ user, session, loading, displayName, signUp, signIn, signInWithGoogle, signOut, updateName }}
    >
      {children}
    </AuthContext.Provider>
  );
}
