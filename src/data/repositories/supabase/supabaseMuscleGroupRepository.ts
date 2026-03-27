import { supabase } from "../../../lib/supabase";
import type { MuscleGroup } from "../../../types/models";
import type { MuscleGroupRepository } from "../../types";

interface DbMuscleGroup {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

function mapMuscleGroup(db: DbMuscleGroup): MuscleGroup {
  return {
    id: db.id,
    name: db.name,
    createdAt: db.created_at,
  };
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export const supabaseMuscleGroupRepository: MuscleGroupRepository = {
  async getAll() {
    const { data, error } = await supabase
      .from("muscle_groups")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return (data as DbMuscleGroup[]).map(mapMuscleGroup);
  },

  async create(name: string) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from("muscle_groups")
      .insert({ user_id: userId, name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error(`Muskelgrupp med namnet "${name}" finns redan`);
      }
      throw error;
    }
    return mapMuscleGroup(data as DbMuscleGroup);
  },

  async update(id: string, name: string) {
    const { data, error } = await supabase
      .from("muscle_groups")
      .update({ name: name.trim() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error(`Muskelgrupp med namnet "${name}" finns redan`);
      }
      throw error;
    }
    return mapMuscleGroup(data as DbMuscleGroup);
  },

  async delete(id: string) {
    const { error } = await supabase.from("muscle_groups").delete().eq("id", id);
    if (error) throw error;
  },
};
