# Architecture

## Data Flow

```
User Action → Component → Zustand Store → Repository → Supabase / localStorage
                ↑                              ↓
                └── re-render ← state update ←─┘
```

## Repository Pattern

All data access goes through repository interfaces defined in `src/data/types.ts`:

- **ExerciseRepository** — CRUD for global exercises
- **CategoryRepository** — CRUD for categories + join-table operations (add/remove exercises to/from categories)
- **SessionRepository** — CRUD for workout sessions

Two implementations exist per interface:
- **Local** (`src/data/repositories/`) — uses localStorage
- **Supabase** (`src/data/repositories/supabase/`) — uses Supabase PostgreSQL

The active implementation is selected automatically in `src/data/repositories/index.ts` based on authentication state.

## Database Schema

Exercises are **global entities** with a many-to-many relationship to categories:

```
global_exercises ←─ category_exercises ─→ categories
                         (join table)

workout_sessions ─→ exercise_logs ─→ workout_sets
```

- `global_exercises` — user-scoped exercise definitions (name, baseReps, baseWeight, isBodyweight)
- `category_exercises` — join table with sort_order per category
- `exercise_logs` stores `exercise_id` (TEXT) + denormalized `exercise_name` for history resilience

## Zustand Stores

| Store | Responsibility |
|-------|---------------|
| `useExerciseStore` | Global exercise library CRUD |
| `useCategoryStore` | Category CRUD + add/remove exercises to/from categories |
| `useSessionStore` | Active workout session, timer state, set logging |
| `useHistoryStore` | Completed workout sessions |

All stores use `persist` middleware for localStorage hydration. `useSessionStore` persists timer state (`startTimestamp`, `pausedDuration`) so the timer survives page refresh.

## Routing

```
/                    → CategoryList (home page)
/category/:id        → Exercise list for a category
/history             → Completed workouts grouped by month
/history/:sessionId  → Workout detail view
/stats               → Statistics overview (PRs, streaks, workout overview)
/stats/:exerciseId   → Exercise progress charts
/profile             → User profile and settings
/login               → Login page
/signup              → Sign up page
```

`AppShell` is the layout route wrapping all pages. It renders the `Header` (fixed top), `SessionTimerBar` (fixed bottom, conditional), and `BottomNav` (fixed bottom).

## Header

The header shows a "+" button on category pages (`/category/:id`) that opens the exercise modal. It dispatches a `CustomEvent("open-exercise-modal")` which the `ExerciseListPage` listens for.

## Timer

The `useTimer` hook uses `requestAnimationFrame` (not `setInterval`) to compute elapsed time:

```
elapsed = Date.now() - startTimestamp - pausedDuration
```

This approach has no drift and survives page refresh since timestamps are persisted in Zustand.

## Session Rules

- A session starts when the user taps "SET 1" on any exercise
- Sessions are locked to one category — tapping SET in a different category while a session is active is blocked
- Pause stores `pauseStartedAt` timestamp, resume adds the delta to `pausedDuration`
- Finishing a session saves it as "completed" with all exercise logs
- Cancel dialog asks "Nej" / "Ja" for confirmation

## Exercise Management

- Exercises are global — they exist independently of categories
- The exercise modal (opened via "+" in header) is the central place to create, assign, and permanently delete exercises
- Swipe-to-delete on a category page only removes the exercise from that category
- Permanent deletion (trash icon in modal) removes the exercise from all categories
- New exercises created in the modal are auto-checked for the current category

## Animations

- Page transitions: 0.2s fade-in
- Item entry: 0.4s slide-in with staggered delays (70ms between items)
- New exercise: 0.45s spring entrance with overshoot
- Bottom sheet: slide-up from bottom
- Rotating tips: 10s interval with 0.7s crossfade
- PB confetti: canvas-confetti on personal records

## Data Migration

- `exerciseGlobalMigration.ts` — runs at app startup, migrates old nested exercise format (exercises inside categories) to the new global format (global exercises + join table)
- `localToSupabase.ts` — one-time migration from localStorage to Supabase on first login
