-- ================================================
-- Migration: Global Exercises with Many-to-Many
-- Run this in the Supabase SQL Editor
-- ================================================

-- ================================================
-- STEP 1: Create new tables
-- ================================================

-- Global exercises (user-scoped, not category-scoped)
CREATE TABLE global_exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  base_reps     INTEGER NOT NULL DEFAULT 10,
  base_weight   REAL NOT NULL DEFAULT 0,
  is_bodyweight BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Join table: many-to-many between categories and global_exercises
CREATE TABLE category_exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  exercise_id   UUID NOT NULL REFERENCES global_exercises(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  UNIQUE(category_id, exercise_id)
);

-- Indexes
CREATE INDEX idx_global_exercises_user ON global_exercises(user_id);
CREATE INDEX idx_category_exercises_category ON category_exercises(category_id, sort_order);
CREATE INDEX idx_category_exercises_exercise ON category_exercises(exercise_id);

-- RLS
ALTER TABLE global_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own global exercises" ON global_exercises
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE category_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own category exercises" ON category_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.id = category_exercises.category_id
        AND categories.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.id = category_exercises.category_id
        AND categories.user_id = auth.uid()
    )
  );

-- ================================================
-- STEP 2: Migrate existing data
-- ================================================

-- 2a. Deduplicate exercises per user by name (lowercase).
--     Pick the first occurrence (lowest id) as the canonical one.
--     Insert into global_exercises.
INSERT INTO global_exercises (id, user_id, name, base_reps, base_weight, is_bodyweight, created_at)
SELECT DISTINCT ON (user_id, LOWER(TRIM(name)))
  id, user_id, name, base_reps, base_weight, is_bodyweight, now()
FROM exercises
ORDER BY user_id, LOWER(TRIM(name)), id ASC;

-- 2b. Create category_exercises join entries for ALL old exercises.
--     Maps each old exercise to its canonical global_exercise by matching
--     user_id + lowercase name.
INSERT INTO category_exercises (category_id, exercise_id, sort_order)
SELECT
  e.category_id,
  ge.id,
  e.sort_order
FROM exercises e
JOIN global_exercises ge
  ON ge.user_id = e.user_id
  AND LOWER(TRIM(ge.name)) = LOWER(TRIM(e.name))
ON CONFLICT (category_id, exercise_id) DO NOTHING;

-- 2c. Update exercise_logs to reference the new global exercise IDs.
--     exercise_logs.exercise_id is TEXT, so we cast for comparison.
UPDATE exercise_logs el
SET exercise_id = ge.id::text
FROM exercises e
JOIN global_exercises ge
  ON ge.user_id = e.user_id
  AND LOWER(TRIM(ge.name)) = LOWER(TRIM(e.name))
WHERE el.exercise_id = e.id::text;

-- ================================================
-- STEP 3: Verify (run these SELECT queries to check)
-- ================================================

-- Check global exercises created:
-- SELECT count(*) FROM global_exercises;

-- Check join entries created:
-- SELECT count(*) FROM category_exercises;

-- Check exercise_logs updated (should return 0 = all remapped):
-- SELECT count(*) FROM exercise_logs el
-- WHERE NOT EXISTS (
--   SELECT 1 FROM global_exercises ge WHERE ge.id::text = el.exercise_id
-- );

-- ================================================
-- STEP 4: Cleanup (run AFTER verifying everything works)
-- ================================================

-- DROP TABLE IF EXISTS exercises;
-- DROP INDEX IF EXISTS idx_exercises_category;
-- DROP POLICY IF EXISTS "Users manage own exercises" ON exercises;
