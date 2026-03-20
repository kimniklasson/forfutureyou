import { supabase } from "../../../lib/supabase";
import type { WorkoutSession, ExerciseLog, WorkoutSet } from "../../../types/models";
import type { SessionRepository } from "../../types";

interface DbSession {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  started_at: string;
  finished_at: string | null;
  paused_duration: number;
  status: "active" | "completed";
  exercise_logs: DbExerciseLog[];
}

interface DbExerciseLog {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  is_bodyweight: boolean;
  workout_sets: DbWorkoutSet[];
}

interface DbWorkoutSet {
  id: string;
  exercise_log_id: string;
  set_number: number;
  reps: number;
  weight: number;
  completed_at: string;
}

function mapSet(db: DbWorkoutSet): WorkoutSet {
  return {
    setNumber: db.set_number,
    reps: db.reps,
    weight: db.weight,
    completedAt: db.completed_at,
  };
}

function mapLog(db: DbExerciseLog): ExerciseLog {
  return {
    exerciseId: db.exercise_id,
    exerciseName: db.exercise_name,
    isBodyweight: db.is_bodyweight,
    sets: (db.workout_sets || []).map(mapSet).sort((a, b) => a.setNumber - b.setNumber),
  };
}

function mapSession(db: DbSession): WorkoutSession {
  return {
    id: db.id,
    categoryId: db.category_id,
    categoryName: db.category_name,
    startedAt: db.started_at,
    finishedAt: db.finished_at,
    pausedDuration: db.paused_duration,
    exerciseLogs: (db.exercise_logs || []).map(mapLog),
    status: db.status,
  };
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// Save queue: serializes all save() calls to prevent race conditions
// where concurrent saves create duplicate exercise_logs or workout_sets.
let saveQueue: Promise<void> = Promise.resolve();

/**
 * Deduplicate exercise_logs AND workout_sets for a session.
 *
 * Handles two kinds of corruption from the race condition:
 * 1. Multiple exercise_log rows for the same exercise — merges into one.
 * 2. Multiple workout_set rows with the same set_number within a single
 *    exercise_log — keeps only the first occurrence of each set_number.
 */
async function deduplicateSession(sessionId: string): Promise<void> {
  const { data: logs, error } = await supabase
    .from("exercise_logs")
    .select("id, exercise_id, workout_sets(id, set_number, reps, weight, completed_at)")
    .eq("session_id", sessionId)
    .order("id", { ascending: true });

  if (error || !logs) return;

  // Group by exercise_id
  const grouped = new Map<string, typeof logs>();
  for (const log of logs) {
    const key = log.exercise_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(log);
  }

  for (const [, group] of grouped) {
    const keepLog = group[0];
    const duplicateLogs = group.slice(1);

    // Collect all sets across all logs, deduplicate by set_number (keep first)
    const allSets: Array<{ set_number: number; reps: number; weight: number; completed_at: string }> = [];
    const seenSetNumbers = new Set<number>();

    for (const log of group) {
      const sets = (log as any).workout_sets || [];
      for (const s of sets) {
        if (!seenSetNumbers.has(s.set_number)) {
          seenSetNumbers.add(s.set_number);
          allSets.push({
            set_number: s.set_number,
            reps: s.reps,
            weight: s.weight,
            completed_at: s.completed_at,
          });
        }
      }
    }

    // Check if anything actually needs fixing
    const originalSetCount = group.reduce(
      (sum, log) => sum + ((log as any).workout_sets?.length ?? 0),
      0
    );
    const hasDuplicateLogs = duplicateLogs.length > 0;
    const hasDuplicateSets = originalSetCount !== allSets.length;

    if (!hasDuplicateLogs && !hasDuplicateSets) continue;

    // Delete sets and logs from duplicates
    if (hasDuplicateLogs) {
      const duplicateIds = duplicateLogs.map((l) => l.id);
      await supabase.from("workout_sets").delete().in("exercise_log_id", duplicateIds);
      await supabase.from("exercise_logs").delete().in("id", duplicateIds);
    }

    // Rewrite the kept log's sets with deduplicated data
    await supabase.from("workout_sets").delete().eq("exercise_log_id", keepLog.id);

    if (allSets.length > 0) {
      const userId = await getUserId();
      const setsToInsert = allSets.map((s) => ({
        user_id: userId,
        exercise_log_id: keepLog.id,
        set_number: s.set_number,
        reps: s.reps,
        weight: s.weight,
        completed_at: s.completed_at,
      }));
      await supabase.from("workout_sets").insert(setsToInsert);
    }
  }
}

export const supabaseSessionRepository: SessionRepository = {
  async getAll() {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("*, exercise_logs(*, workout_sets(*))")
      .order("started_at", { ascending: false });

    if (error) throw error;
    return (data as DbSession[]).map(mapSession);
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("*, exercise_logs(*, workout_sets(*))")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return mapSession(data as DbSession);
  },

  async getActive() {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("*, exercise_logs(*, workout_sets(*))")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapSession(data as DbSession);
  },

  async save(session: WorkoutSession) {
    // Queue saves so only one runs at a time — prevents duplicate rows
    const doSave = async () => {
      const userId = await getUserId();

      // Upsert the session
      const { error: sessionError } = await supabase
        .from("workout_sessions")
        .upsert({
          id: session.id,
          user_id: userId,
          category_id: session.categoryId,
          category_name: session.categoryName,
          started_at: session.startedAt,
          finished_at: session.finishedAt,
          paused_duration: session.pausedDuration,
          status: session.status,
        });

      if (sessionError) throw sessionError;

      // Sync exercise logs and sets
      for (const log of session.exerciseLogs) {
        // Check if log exists — may return multiple due to past race conditions
        const { data: existingLogs } = await supabase
          .from("exercise_logs")
          .select("id")
          .eq("session_id", session.id)
          .eq("exercise_id", log.exerciseId)
          .order("id", { ascending: true });

        let logId: string;

        if (existingLogs && existingLogs.length > 0) {
          logId = existingLogs[0].id;

          // Clean up any duplicate logs from past race conditions
          if (existingLogs.length > 1) {
            const duplicateIds = existingLogs.slice(1).map((l) => l.id);
            await supabase.from("workout_sets").delete().in("exercise_log_id", duplicateIds);
            await supabase.from("exercise_logs").delete().in("id", duplicateIds);
          }
        } else {
          const { data: newLog, error: logError } = await supabase
            .from("exercise_logs")
            .insert({
              user_id: userId,
              session_id: session.id,
              exercise_id: log.exerciseId,
              exercise_name: log.exerciseName,
              is_bodyweight: log.isBodyweight,
            })
            .select("id")
            .single();

          if (logError) throw logError;
          logId = newLog.id;
        }

        // Upsert sets — delete existing and re-insert for simplicity
        await supabase
          .from("workout_sets")
          .delete()
          .eq("exercise_log_id", logId);

        if (log.sets.length > 0) {
          const setsToInsert = log.sets.map((s) => ({
            user_id: userId,
            exercise_log_id: logId,
            set_number: s.setNumber,
            reps: s.reps,
            weight: s.weight,
            completed_at: s.completedAt,
          }));

          const { error: setsError } = await supabase
            .from("workout_sets")
            .insert(setsToInsert);

          if (setsError) throw setsError;
        }
      }
    };

    // Chain onto the queue so saves are serialized
    saveQueue = saveQueue.then(doSave, doSave);
    return saveQueue;
  },

  async delete(id: string) {
    // Cascade will handle exercise_logs and workout_sets
    const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
    if (error) throw error;
  },

  /**
   * Run deduplication cleanup on all sessions (or a specific one).
   * Call this once to fix data corrupted by the race condition bug.
   */
  async cleanup(sessionId?: string) {
    if (sessionId) {
      await deduplicateSession(sessionId);
      return;
    }
    // Clean all sessions
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("id");
    if (sessions) {
      for (const s of sessions) {
        await deduplicateSession(s.id);
      }
    }
  },
};
