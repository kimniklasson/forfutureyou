-- Migration: Add muscle groups feature
-- User-defined muscle groups (per user, unique names)

CREATE TABLE muscle_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE muscle_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own muscle groups"
  ON muscle_groups
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Exercise assignments (which muscle groups are assigned to which exercise, with percentage)
CREATE TABLE exercise_muscle_groups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id      UUID NOT NULL REFERENCES global_exercises(id) ON DELETE CASCADE,
  muscle_group_id  UUID NOT NULL REFERENCES muscle_groups(id) ON DELETE CASCADE,
  percentage       INTEGER NOT NULL DEFAULT 100
    CHECK (percentage >= 0 AND percentage <= 100),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, muscle_group_id)
);

ALTER TABLE exercise_muscle_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own exercise muscle groups"
  ON exercise_muscle_groups
  USING (
    exercise_id IN (
      SELECT id FROM global_exercises WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    exercise_id IN (
      SELECT id FROM global_exercises WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_emg_exercise_id ON exercise_muscle_groups(exercise_id);
CREATE INDEX idx_emg_muscle_group_id ON exercise_muscle_groups(muscle_group_id);

-- Snapshot column on exercise_logs: stores [{name, percentage}] at time of logging
-- Resilient to future edits or deletions of muscle groups
ALTER TABLE exercise_logs
  ADD COLUMN muscle_groups JSONB NOT NULL DEFAULT '[]'::jsonb;
