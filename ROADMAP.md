# Roadmap

## Phase 1: MVP
- [x] Category management (create, delete, reorder via drag & drop)
- [x] Global exercise library (create, edit, permanent delete)
- [x] Many-to-many: exercises can belong to multiple categories
- [x] Exercise modal with search, create, toggle per category, trash icon
- [x] Active workout sessions with live timer (requestAnimationFrame)
- [x] Set logging with +/- adjustments and inline editing
- [x] Pause/resume timer
- [x] Completed workout history (grouped by month)
- [x] Workout detail view with totals
- [x] PWA support (installable)
- [x] localStorage persistence

## Phase 2: Backend & Auth
- [x] Supabase backend (PostgreSQL + RLS)
- [x] User authentication (email/password)
- [x] Cloud sync across devices
- [x] Data migration: localStorage → Supabase on first login
- [x] Repository pattern with auto-switching (local vs Supabase)

## Phase 3: UX & Design
- [x] Dark mode (full theme support)
- [x] Swipe gestures (left to remove from category, right to duplicate)
- [x] Staggered entrance animations
- [x] Personal records tracking with confetti
- [x] Statistics page (PRs, streaks, workout overview)
- [x] Exercise progress charts (heaviest lift + total volume)
- [x] Rotating tip messages on category pages
- [x] Empty state messages
- [x] Session cancel confirmation (Nej/Ja)

## Phase 4: Future
- [ ] Rest timer between sets (configurable)
- [ ] Workout templates / programs
- [ ] Export workout data (CSV/JSON)
- [ ] Share workouts
- [ ] Notifications / reminders
- [ ] Apple Health / Google Fit integration
