# Data Models

## TypeScript Interfaces

### Exercise (Global)
```typescript
interface Exercise {
  id: string;           // UUID
  name: string;         // e.g. "Bänkpress"
  baseReps: number;     // default starting reps
  baseWeight: number;   // default starting weight (kg)
  isBodyweight: boolean; // if true, display as "Kroppsvikt + X kg"
}
```

### CategoryExercise (Exercise within a category context)
```typescript
interface CategoryExercise extends Exercise {
  sortOrder: number;    // ordering within the category
}
```

### Category
```typescript
interface Category {
  id: string;           // UUID
  name: string;         // e.g. "Bröst och triceps"
  exercises: CategoryExercise[]; // populated via join table
  createdAt: string;    // ISO 8601 timestamp
  sortOrder: number;    // for ordering
}
```

### WorkoutSet
```typescript
interface WorkoutSet {
  setNumber: number;    // 1, 2, 3...
  reps: number;
  weight: number;       // kg (extra weight for bodyweight exercises)
  completedAt: string;  // ISO 8601 timestamp
}
```

### ExerciseLog
```typescript
interface ExerciseLog {
  exerciseId: string;    // references global exercise ID
  exerciseName: string;  // denormalized snapshot — survives exercise deletion
  isBodyweight: boolean;
  sets: WorkoutSet[];
}
```

### WorkoutSession
```typescript
interface WorkoutSession {
  id: string;
  categoryId: string;
  categoryName: string;   // snapshot — survives category deletion
  startedAt: string;      // ISO 8601
  finishedAt: string | null;
  pausedDuration: number; // milliseconds spent paused
  exerciseLogs: ExerciseLog[];
  status: "active" | "completed";
}
```

## Supabase Tables

| Table | Description |
|-------|-------------|
| `global_exercises` | Global exercise definitions (user-scoped) |
| `category_exercises` | Join table: many-to-many between categories and exercises, with sort_order |
| `categories` | Workout categories (user-scoped) |
| `workout_sessions` | Workout sessions with status and timing |
| `exercise_logs` | Logged exercises per session (exercise_id as TEXT, denormalized name) |
| `workout_sets` | Individual sets per exercise log |

### Relationships
```
global_exercises ←── category_exercises ──→ categories
                          (M:N join)

workout_sessions ──→ exercise_logs ──→ workout_sets
     (1:N)              (1:N)
```

All tables have RLS (Row Level Security) policies scoped to `auth.uid() = user_id`.

## localStorage Keys

All keys are prefixed with `workout-app:`.

| Key | Type | Description |
|-----|------|-------------|
| `workout-app:global-exercises` | `Exercise[]` | Global exercise library |
| `workout-app:categories` | `Category[]` | Categories (exercises populated via join) |
| `workout-app:category-exercises` | `JoinEntry[]` | Join table: categoryId, exerciseId, sortOrder |
| `workout-app:sessions` | `WorkoutSession[]` | All workout sessions |
| `workout-app:category-store` | Zustand state | Category store hydration |
| `workout-app:exercise-store` | Zustand state | Exercise store hydration |
| `workout-app:session-store` | Zustand state | Session store hydration (includes timer state) |
| `workout-app:global-exercises-migration-done` | `"true"` | Migration flag |
