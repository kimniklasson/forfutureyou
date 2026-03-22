import { supabase } from "../../../lib/supabase";
import type { Category, CategoryExercise } from "../../../types/models";
import type { CategoryRepository } from "../../types";

interface DbGlobalExercise {
  id: string;
  name: string;
  base_reps: number;
  base_weight: number;
  is_bodyweight: boolean;
}

interface DbCategoryExerciseJoin {
  sort_order: number;
  exercise: DbGlobalExercise;
}

interface DbCategory {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  category_exercises: DbCategoryExerciseJoin[];
}

function mapCategory(db: DbCategory): Category {
  const exercises: CategoryExercise[] = (db.category_exercises || [])
    .map((ce) => ({
      id: ce.exercise.id,
      name: ce.exercise.name,
      baseReps: ce.exercise.base_reps,
      baseWeight: ce.exercise.base_weight,
      isBodyweight: ce.exercise.is_bodyweight,
      sortOrder: ce.sort_order,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: db.id,
    name: db.name,
    exercises,
    createdAt: db.created_at,
    sortOrder: db.sort_order,
  };
}

const CATEGORY_SELECT = "*, category_exercises(sort_order, exercise:global_exercises(*))";

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export const supabaseCategoryRepository: CategoryRepository = {
  async getAll() {
    const { data, error } = await supabase
      .from("categories")
      .select(CATEGORY_SELECT)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return (data as DbCategory[]).map(mapCategory);
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("categories")
      .select(CATEGORY_SELECT)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return mapCategory(data as DbCategory);
  },

  async create(name: string) {
    const userId = await getUserId();

    const { data: existing } = await supabase
      .from("categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);

    const sortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data, error } = await supabase
      .from("categories")
      .insert({ user_id: userId, name, sort_order: sortOrder })
      .select(CATEGORY_SELECT)
      .single();

    if (error) throw error;
    return mapCategory(data as DbCategory);
  },

  async update(id, data) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

    const { data: result, error } = await supabase
      .from("categories")
      .update(updateData)
      .eq("id", id)
      .select(CATEGORY_SELECT)
      .single();

    if (error) throw error;
    return mapCategory(result as DbCategory);
  },

  async delete(id) {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
  },

  async addExerciseToCategory(categoryId, exerciseId) {
    // Get current max sort_order
    const { data: existing } = await supabase
      .from("category_exercises")
      .select("sort_order")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const sortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { error } = await supabase
      .from("category_exercises")
      .upsert(
        { category_id: categoryId, exercise_id: exerciseId, sort_order: sortOrder },
        { onConflict: "category_id,exercise_id" }
      );

    if (error) throw error;
  },

  async removeExerciseFromCategory(categoryId, exerciseId) {
    const { error } = await supabase
      .from("category_exercises")
      .delete()
      .eq("category_id", categoryId)
      .eq("exercise_id", exerciseId);

    if (error) throw error;
  },

  async reorderCategories(orderedIds) {
    const updates = orderedIds.map((id, index) =>
      supabase.from("categories").update({ sort_order: index }).eq("id", id)
    );
    await Promise.all(updates);
  },

  async reorderExercises(categoryId, orderedIds) {
    const updates = orderedIds.map((exerciseId, index) =>
      supabase
        .from("category_exercises")
        .update({ sort_order: index })
        .eq("category_id", categoryId)
        .eq("exercise_id", exerciseId)
    );
    await Promise.all(updates);
  },
};
