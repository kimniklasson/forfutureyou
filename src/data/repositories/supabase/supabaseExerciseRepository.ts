import { supabase } from "../../../lib/supabase";
import type { Exercise } from "../../../types/models";
import type { ExerciseRepository } from "../../types";

interface DbExercise {
  id: string;
  user_id: string;
  name: string;
  base_reps: number;
  base_weight: number;
  is_bodyweight: boolean;
}

function mapExercise(db: DbExercise): Exercise {
  return {
    id: db.id,
    name: db.name,
    baseReps: db.base_reps,
    baseWeight: db.base_weight,
    isBodyweight: db.is_bodyweight,
  };
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export const supabaseExerciseRepository: ExerciseRepository = {
  async getAll() {
    const { data, error } = await supabase
      .from("global_exercises")
      .select("*")
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
      .select()
      .single();

    if (error) throw error;
    return mapExercise(result as DbExercise);
  },

  async update(id, data) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.baseReps !== undefined) updateData.base_reps = data.baseReps;
    if (data.baseWeight !== undefined) updateData.base_weight = data.baseWeight;
    if (data.isBodyweight !== undefined) updateData.is_bodyweight = data.isBodyweight;

    const { data: result, error } = await supabase
      .from("global_exercises")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return mapExercise(result as DbExercise);
  },

  async delete(id) {
    const { error } = await supabase.from("global_exercises").delete().eq("id", id);
    if (error) throw error;
  },
};
