import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  WorkoutSession,
  ExerciseAdjustment,
} from "../types/models";
import { getSessionRepository } from "../data/repositories";
import { useHistoryStore } from "./useHistoryStore";

interface SessionState {
  /** The currently active workout session, or null */
  activeSession: WorkoutSession | null;
  /** Per-exercise temporary reps/weight adjustments */
  adjustments: ExerciseAdjustment[];

  // Timer state (persisted for refresh survival)
  isRunning: boolean;
  isPaused: boolean;
  startTimestamp: number | null;
  pausedDuration: number;
  pauseStartedAt: number | null;

  // Actions
  startSession: (categoryId: string, categoryName: string) => void;
  logSet: (
    exerciseId: string,
    exerciseName: string,
    isBodyweight: boolean,
    reps: number,
    weight: number
  ) => void;
  togglePause: () => void;
  finishSession: () => Promise<WorkoutSession | null>;
  cancelSession: () => void;

  // Adjustment helpers
  getAdjustment: (exerciseId: string, baseReps: number, baseWeight: number) => ExerciseAdjustment;
  setAdjustment: (exerciseId: string, reps: number, weight: number) => void;

  // Helpers
  getExerciseSetCount: (exerciseId: string) => number;
  hasActiveSession: () => boolean;
  isSessionForCategory: (categoryId: string) => boolean;
  reset: () => void;
}

const initialState = {
  activeSession: null,
  adjustments: [],
  isRunning: false,
  isPaused: false,
  startTimestamp: null,
  pausedDuration: 0,
  pauseStartedAt: null,
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      ...initialState,

      startSession: (categoryId, categoryName) => {
        const session: WorkoutSession = {
          id: crypto.randomUUID(),
          categoryId,
          categoryName,
          startedAt: new Date().toISOString(),
          finishedAt: null,
          pausedDuration: 0,
          exerciseLogs: [],
          status: "active",
        };
        getSessionRepository().save(session);
        set({
          activeSession: session,
          adjustments: [],
          isRunning: true,
          isPaused: false,
          startTimestamp: Date.now(),
          pausedDuration: 0,
          pauseStartedAt: null,
        });
      },

      logSet: (exerciseId, exerciseName, isBodyweight, reps, weight) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const existingIdx = activeSession.exerciseLogs.findIndex(
          (l) => l.exerciseId === exerciseId
        );

        const newSet = {
          setNumber:
            existingIdx >= 0
              ? activeSession.exerciseLogs[existingIdx].sets.length + 1
              : 1,
          reps,
          weight,
          completedAt: new Date().toISOString(),
        };

        let updatedLogs;
        if (existingIdx >= 0) {
          // Clone the log immutably — no mutation of existing state
          updatedLogs = activeSession.exerciseLogs.map((log, i) =>
            i === existingIdx
              ? { ...log, sets: [...log.sets, newSet] }
              : log
          );
        } else {
          updatedLogs = [
            ...activeSession.exerciseLogs,
            { exerciseId, exerciseName, isBodyweight, sets: [newSet] },
          ];
        }

        const updatedSession = { ...activeSession, exerciseLogs: updatedLogs };
        getSessionRepository().save(updatedSession);
        set({ activeSession: updatedSession });
      },

      togglePause: () => {
        const { isPaused, pauseStartedAt, pausedDuration } = get();
        if (isPaused && pauseStartedAt) {
          const additionalPause = Date.now() - pauseStartedAt;
          set({
            isPaused: false,
            pauseStartedAt: null,
            pausedDuration: pausedDuration + additionalPause,
          });
        } else {
          set({
            isPaused: true,
            pauseStartedAt: Date.now(),
          });
        }
      },

      finishSession: async () => {
        const { activeSession, isPaused, pauseStartedAt, pausedDuration } = get();
        if (!activeSession) return null;

        let totalPaused = pausedDuration;
        if (isPaused && pauseStartedAt) {
          totalPaused += Date.now() - pauseStartedAt;
        }

        const finishedSession: WorkoutSession = {
          ...activeSession,
          finishedAt: new Date().toISOString(),
          pausedDuration: totalPaused,
          status: "completed",
        };
        await getSessionRepository().save(finishedSession);

        set({ ...initialState });

        await useHistoryStore.getState().loadSessions();

        return finishedSession;
      },

      cancelSession: () => {
        const { activeSession } = get();
        if (activeSession) {
          getSessionRepository().delete(activeSession.id);
        }
        set({ ...initialState });
      },

      getAdjustment: (exerciseId, baseReps, baseWeight) => {
        const existing = get().adjustments.find((a) => a.exerciseId === exerciseId);
        return existing ?? { exerciseId, currentReps: baseReps, currentWeight: baseWeight };
      },

      setAdjustment: (exerciseId, reps, weight) => {
        set((state) => {
          const filtered = state.adjustments.filter((a) => a.exerciseId !== exerciseId);
          return {
            adjustments: [
              ...filtered,
              { exerciseId, currentReps: reps, currentWeight: weight },
            ],
          };
        });
      },

      getExerciseSetCount: (exerciseId) => {
        const { activeSession } = get();
        if (!activeSession) return 0;
        const log = activeSession.exerciseLogs.find((l) => l.exerciseId === exerciseId);
        return log?.sets.length ?? 0;
      },

      hasActiveSession: () => {
        return get().activeSession !== null;
      },

      isSessionForCategory: (categoryId) => {
        return get().activeSession?.categoryId === categoryId;
      },

      reset: () => {
        set({ ...initialState });
      },
    }),
    {
      name: "workout-app:session-store",
    }
  )
);
