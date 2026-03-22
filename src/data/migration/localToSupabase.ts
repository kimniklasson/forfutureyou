import { supabase } from "../../lib/supabase";
import { getItem, removeItem } from "../storage";
import type { Category, WorkoutSession } from "../../types/models";

const MIGRATION_KEY = "migration-done";

/**
 * Migrates localStorage data to Supabase for a newly authenticated user.
 * Only runs once — skips if no local data or already migrated.
 */
export async function migrateLocalDataToSupabase(): Promise<boolean> {
  // Check if already migrated
  const alreadyDone = localStorage.getItem(MIGRATION_KEY);
  if (alreadyDone) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const categories = getItem<Category[]>("categories");
  const sessions = getItem<WorkoutSession[]>("sessions");

  const hasData =
    (categories && categories.length > 0) || (sessions && sessions.length > 0);

  if (!hasData) {
    localStorage.setItem(MIGRATION_KEY, "true");
    return false;
  }

  try {
    // Migrate categories and exercises
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        const { error: catError } = await supabase.from("categories").insert({
          id: cat.id,
          user_id: user.id,
          name: cat.name,
          sort_order: cat.sortOrder,
          created_at: cat.createdAt,
        });

        if (catError) {
          // Skip if already exists (duplicate key)
          if (catError.code === "23505") continue;
          throw catError;
        }

        if (cat.exercises && cat.exercises.length > 0) {
          for (const ex of cat.exercises) {
            // Insert global exercise (skip if already exists)
            const { error: gError } = await supabase
              .from("global_exercises")
              .insert({
                id: ex.id,
                user_id: user.id,
                name: ex.name,
                base_reps: ex.baseReps,
                base_weight: ex.baseWeight,
                is_bodyweight: ex.isBodyweight,
              });

            if (gError && gError.code !== "23505") throw gError;

            // Insert join entry
            const { error: jError } = await supabase
              .from("category_exercises")
              .insert({
                category_id: cat.id,
                exercise_id: ex.id,
                sort_order: ex.sortOrder ?? 0,
              });

            if (jError && jError.code !== "23505") throw jError;
          }
        }
      }
    }

    // Migrate sessions
    if (sessions && sessions.length > 0) {
      for (const session of sessions) {
        const { error: sessError } = await supabase
          .from("workout_sessions")
          .insert({
            id: session.id,
            user_id: user.id,
            category_id: session.categoryId,
            category_name: session.categoryName,
            started_at: session.startedAt,
            finished_at: session.finishedAt,
            paused_duration: session.pausedDuration,
            status: session.status,
          });

        if (sessError) {
          if (sessError.code === "23505") continue;
          throw sessError;
        }

        for (const log of session.exerciseLogs) {
          const { data: newLog, error: logError } = await supabase
            .from("exercise_logs")
            .insert({
              user_id: user.id,
              session_id: session.id,
              exercise_id: log.exerciseId,
              exercise_name: log.exerciseName,
              is_bodyweight: log.isBodyweight,
            })
            .select("id")
            .single();

          if (logError) {
            if (logError.code === "23505") continue;
            throw logError;
          }

          if (log.sets.length > 0) {
            const setsToInsert = log.sets.map((s) => ({
              user_id: user.id,
              exercise_log_id: newLog.id,
              set_number: s.setNumber,
              reps: s.reps,
              weight: s.weight,
              completed_at: s.completedAt,
            }));

            const { error: setsError } = await supabase
              .from("workout_sets")
              .insert(setsToInsert);

            if (setsError && setsError.code !== "23505") throw setsError;
          }
        }
      }
    }

    // Clear localStorage data after successful migration
    removeItem("categories");
    removeItem("sessions");
    localStorage.removeItem("workout-app:category-store");
    localStorage.removeItem("workout-app:session-store");
    localStorage.setItem(MIGRATION_KEY, "true");

    return true;
  } catch (error) {
    console.error("Migration failed:", error);
    return false;
  }
}
