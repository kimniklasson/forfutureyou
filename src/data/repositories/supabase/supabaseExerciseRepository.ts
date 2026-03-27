import { supabase } from "../../../lib/supabase";
import type { Exercise, MuscleGroupAssignment } from "../../../types/models";
import type { ExerciseRepository } from "../../types";

interface DbMuscleGroupJoin {
  percentage: number;
  muscle_group: {
    id: string;
    name: string;
  };
}

interface DbExercise {
  id: string;
  user_id: string;
  name: string;
  base_reps: number;
  base_weight: number;
  is_bodyweight: boolean;
  exercise_muscle_groups: DbMuscleGroupJoin[];
}

const EXERCISE_SELECT = "*, exercise_muscle_groups(percentage, muscle_group:muscle_groups(id, name))";

function mapExercise(db: DbExercise): Exercise {
  return {
    id: db.id,
    name: db.name,
    baseReps: db.base_reps,
    baseWeight: db.base_weight,
    isBodyweight: db.is_bodyweight,
    muscleGroups: (db.exercise_muscle_groups ?? []).map(
      (emg): MuscleGroupAssignment => ({
        muscleGroupId: emg.muscle_group.id,
        muscleGroupName: emg.muscle_group.name,
        percentage: emg.percentage,
      })
    ),
  };
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

async function syncMuscleGroups(exerciseId: string, muscleGroups: MuscleGroupAssignment[]): Promise<void> {
  // Delete all existing assignments, then re-insert
  await supabase.from("exercise_muscle_groups").delete().eq("exercise_id", exerciseId);

  if (muscleGroups.length > 0) {
    const rows = muscleGroups.map((mg) => ({
      exercise_id: exerciseId,
      muscle_group_id: mg.muscleGroupId,
      percentage: mg.percentage,
    }));
    const { error } = await supabase.from("exercise_muscle_groups").insert(rows);
    if (error) throw error;
  }
}

export const supabaseExerciseRepository: ExerciseRepository = {
  async getAll() {
    const { data, error } = await supabase
      .from("global_exercises")
      .select(EXERCISE_SELECT)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data as DbExercise[]).map(mapExercise);
  },

  async create(data) {
    const userId = await getUserId();

    const { data: result, error } = await supabase
      .from("global_exercises")
      .insert({
        user_id: userId,
        name: data.name,
        base_reps: data.baseReps,
        base_weight: data.baseWeight,
        is_bodyweight: data.isBodyweight,
      })
      .select(EXERCISE_SELECT)
      .single();

    if (error) throw error;
    const exercise = mapExercise(result as DbExercise);

    if (data.muscleGroups && data.muscleGroups.length > 0) {
      await syncMuscleGroups(exercise.id, data.muscleGroups);
      // Reload to get the joined muscle groups
      const { data: reloaded, error: reloadError } = await supabase
        .from("global_exercises")
        .select(EXERCISE_SELECT)
        .eq("id", exercise.id)
        .single();
      if (reloadError) throw reloadError;
      return mapExercise(reloaded as DbExercise);
    }

    return exercise;
  },

  async update(id, data) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.baseReps !== undefined) updateData.base_reps = data.baseReps;
    if (data.baseWeight !== undefined) updateData.base_weight = data.baseWeight;
    if (data.isBodyweight !== undefined) updateData.is_bodyweight = data.isBodyweight;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("global_exercises")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    }

    if (data.muscleGroups !== undefined) {
      await syncMuscleGroups(id, data.muscleGroups);
    }

    const { data: result, error: fetchError } = await supabase
      .from("global_exercises")
      .select(EXERCISE_SELECT)
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    return mapExercise(result as DbExercise);
  },

  async delete(id) {
    const { error } = await supabase.from("global_exercises").delete().eq("id", id);
    if (error) throw error;
  },
};
