import { create } from "zustand";
import type { WorkoutSession } from "../types/models";
import { getSessionRepository } from "../data/repositories";
import { groupSessionsByMonth } from "../utils/groupByMonth";

export interface MonthGroup {
  label: string;
  sessions: WorkoutSession[];
}

interface HistoryState {
  sessions: WorkoutSession[];
  loadSessions: () => Promise<void>;
  getGroupedByMonth: () => MonthGroup[];
  getSessionById: (id: string) => WorkoutSession | undefined;
  updateSession: (session: WorkoutSession) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  reset: () => void;
}

// Run cleanup only once per app session
let sessionCleanupDone = false;

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  sessions: [],

  loadSessions: async () => {
    const repo = getSessionRepository();

    // Run one-time deduplication cleanup if the repo supports it
    if (repo.cleanup && !sessionCleanupDone) {
      sessionCleanupDone = true;
      try {
        await repo.cleanup();
      } catch {
        // Cleanup is best-effort — don't block loading
      }
    }

    const all = await repo.getAll();
    set({ sessions: all.filter((s) => s.status === "completed") });
  },

  getGroupedByMonth: () => {
    return groupSessionsByMonth(get().sessions);
  },

  getSessionById: (id) => {
    return get().sessions.find((s) => s.id === id);
  },

  updateSession: async (session) => {
    const repo = getSessionRepository();
    await repo.save(session);
    set((state) => ({
      sessions: state.sessions.map((s) => s.id === session.id ? session : s),
    }));
  },

  deleteSession: async (id) => {
    const repo = getSessionRepository();
    await repo.delete(id);
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
    }));
  },

  reset: () => {
    set({ sessions: [] });
  },
}));
