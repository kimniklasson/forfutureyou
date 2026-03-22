import type { CategoryRepository, ExerciseRepository, SessionRepository } from "../types";
import { categoryRepository as localCategoryRepo } from "./categoryRepository";
import { exerciseRepository as localExerciseRepo } from "./exerciseRepository";
import { sessionRepository as localSessionRepo } from "./sessionRepository";
import { supabaseCategoryRepository } from "./supabase/supabaseCategoryRepository";
import { supabaseExerciseRepository } from "./supabase/supabaseExerciseRepository";
import { supabaseSessionRepository } from "./supabase/supabaseSessionRepository";
import { supabase } from "../../lib/supabase";

let isAuthenticated = false;

// Listen for auth changes to update the flag
supabase.auth.onAuthStateChange((_event, session) => {
  isAuthenticated = !!session?.user;
});

// Initialize from current session
supabase.auth.getSession().then(({ data: { session } }) => {
  isAuthenticated = !!session?.user;
});

export function getCategoryRepository(): CategoryRepository {
  return isAuthenticated ? supabaseCategoryRepository : localCategoryRepo;
}

export function getExerciseRepository(): ExerciseRepository {
  return isAuthenticated ? supabaseExerciseRepository : localExerciseRepo;
}

export function getSessionRepository(): SessionRepository {
  return isAuthenticated ? supabaseSessionRepository : localSessionRepo;
}
