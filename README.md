# Allceps — Workout Tracking Web App

A mobile-first workout tracking web app where users create workout categories, manage a global exercise library, log sets during sessions with a live timer, and track progress with statistics and personal records.

## Tech Stack

- **React 18 + TypeScript** — UI framework
- **Vite** — Build tool
- **React Router v6** — Client-side routing
- **Zustand** — State management with localStorage persistence
- **Tailwind CSS 4** — Utility-first styling
- **Supabase** — Backend (PostgreSQL database, authentication, RLS)
- **Vercel** — Hosting and deployment
- **Custom SVG icons** — Hand-crafted icon set

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Use Chrome DevTools mobile viewport (393px) for the intended experience.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Architecture

The app uses a **repository pattern** for data access — Zustand stores call repository methods, never touching storage directly. Two implementations exist: localStorage (offline/dev) and Supabase (authenticated users). The active implementation is selected automatically based on auth state.

```
src/
  auth/           → Authentication provider (Supabase)
  components/     → UI components organized by feature
  data/           → Repository pattern (localStorage + Supabase implementations)
  hooks/          → Custom hooks (timer, drag-sort, PB tracking)
  lib/            → Supabase client configuration
  stores/         → Zustand stores (exercises, categories, session, history)
  types/          → TypeScript interfaces
  utils/          → Utility functions (formatting, calculations, statistics, confetti)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

## Key Features

- **Global exercise library** — Exercises exist independently and can be assigned to multiple categories
- **Category workouts** — Organize exercises into training categories (e.g. "Chest & Triceps")
- **Live session timer** — Start sessions by tapping SET, with pause/resume and elapsed time
- **Swipe gestures** — Swipe left to remove from category, right to duplicate
- **Personal records** — Automatic PB tracking with confetti celebration
- **Statistics** — Progress charts (heaviest lift + total volume per exercise), streaks, workout overview
- **Dark mode** — Full dark theme support
- **PWA** — Installable on mobile devices
