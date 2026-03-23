import type { WorkoutSession } from "../types/models";
import type { Sex } from "../stores/useSettingsStore";

export interface WorkoutTotals {
  totalSets: number;
  totalReps: number;
  totalWeight: number;
}

export function calculateWorkoutTotals(session: WorkoutSession, userWeight: number = 0): WorkoutTotals {
  let totalSets = 0;
  let totalReps = 0;
  let totalWeight = 0;

  for (const log of session.exerciseLogs) {
    for (const set of log.sets) {
      totalSets++;
      totalReps += set.reps;
      totalWeight += log.isBodyweight
        ? (userWeight + set.weight) * set.reps
        : set.weight * set.reps;
    }
  }

  return { totalSets, totalReps, totalWeight };
}

// ─── Rest time calculations ───

export interface RestTimeData {
  interSetRests: number[];
  interExerciseRests: number[];
  avgInterSetRestMs: number;
  avgInterExerciseRestMs: number;
  totalRestMs: number;
  setDurations: number[];
}

interface TimedSet {
  exerciseId: string;
  startedAt: number;
  completedAt: number;
}

function toTimedSets(session: WorkoutSession): TimedSet[] {
  const sets: TimedSet[] = [];
  for (const log of session.exerciseLogs) {
    for (const s of log.sets) {
      sets.push({
        exerciseId: log.exerciseId,
        startedAt: s.startedAt
          ? new Date(s.startedAt).getTime()
          : new Date(s.completedAt).getTime(),
        completedAt: new Date(s.completedAt).getTime(),
      });
    }
  }
  sets.sort((a, b) => a.startedAt - b.startedAt);
  return sets;
}

export function calculateRestTimes(session: WorkoutSession): RestTimeData {
  const timedSets = toTimedSets(session);
  const interSetRests: number[] = [];
  const interExerciseRests: number[] = [];
  const setDurations: number[] = [];

  for (let i = 0; i < timedSets.length; i++) {
    const s = timedSets[i];
    const dur = s.completedAt - s.startedAt;
    if (dur > 0) setDurations.push(dur);

    if (i > 0) {
      const prev = timedSets[i - 1];
      const rest = s.startedAt - prev.completedAt;
      if (rest >= 0) {
        if (s.exerciseId === prev.exerciseId) {
          interSetRests.push(rest);
        } else {
          interExerciseRests.push(rest);
        }
      }
    }
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const allRests = [...interSetRests, ...interExerciseRests];

  return {
    interSetRests,
    interExerciseRests,
    avgInterSetRestMs: avg(interSetRests),
    avgInterExerciseRestMs: avg(interExerciseRests),
    totalRestMs: allRests.reduce((a, b) => a + b, 0),
    setDurations,
  };
}

// ─── Intensity score ───

export interface IntensityMetrics {
  score: number;
  avgRestTimeSec: number;
  volumePerMinute: number;
  setDensity: number;
  workRestRatio: number;
}

export function getSessionDurationMs(session: WorkoutSession): number {
  if (!session.finishedAt) return 0;
  return (
    new Date(session.finishedAt).getTime() -
    new Date(session.startedAt).getTime() -
    session.pausedDuration
  );
}

export function calculateIntensity(
  session: WorkoutSession,
  userWeight: number
): IntensityMetrics {
  const restData = calculateRestTimes(session);
  const totals = calculateWorkoutTotals(session, userWeight);
  const durationMs = getSessionDurationMs(session);
  const activeMinutes = durationMs / 60000;

  const allRests = [...restData.interSetRests, ...restData.interExerciseRests];
  const avgRestTimeSec =
    allRests.length > 0
      ? allRests.reduce((a, b) => a + b, 0) / allRests.length / 1000
      : 0;

  const volumePerMinute =
    activeMinutes > 0 ? totals.totalWeight / activeMinutes : 0;
  const setDensity =
    activeMinutes > 0 ? totals.totalSets / activeMinutes : 0;

  const totalWorkMs = restData.setDurations.reduce((a, b) => a + b, 0);
  const workRestRatio =
    restData.totalRestMs > 0 ? totalWorkMs / restData.totalRestMs : 0;

  // Sub-scores (0-100)
  const restScore =
    avgRestTimeSec > 0
      ? Math.max(0, Math.min(100, 100 - ((avgRestTimeSec - 30) / 150) * 100))
      : 50; // default if no rest data
  const volumeScore = Math.min(100, (volumePerMinute / 200) * 100);
  const densityScore = Math.min(100, setDensity * 100);
  const ratioScore = Math.min(100, workRestRatio * 200);

  const score = Math.round(
    restScore * 0.35 +
      densityScore * 0.25 +
      volumeScore * 0.25 +
      ratioScore * 0.15
  );

  return {
    score: Math.max(1, Math.min(100, score)),
    avgRestTimeSec: Math.round(avgRestTimeSec),
    volumePerMinute: Math.round(volumePerMinute * 10) / 10,
    setDensity: Math.round(setDensity * 100) / 100,
    workRestRatio: Math.round(workRestRatio * 100) / 100,
  };
}

// ─── Calorie calculation ───

export function calculateCalories(
  session: WorkoutSession,
  userWeight: number,
  userAge: number,
  userSex: Sex | null,
  intensityScore?: number
): number {
  if (!session.finishedAt || userWeight <= 0) return 0;

  const durationMs = getSessionDurationMs(session);
  const durationHours = durationMs / 3600000;

  // MET: interpolate 3.5 (light) to 6.0 (vigorous) based on intensity
  const baseMET =
    intensityScore != null ? 3.5 + (intensityScore / 100) * 2.5 : 4.5;

  // Age adjustment: ~0.5% decrease per year after 30, floor 0.75
  const ageMultiplier =
    userAge > 30 ? Math.max(0.75, 1 - (userAge - 30) * 0.005) : 1.0;

  // Sex adjustment
  const sexMultiplier = userSex === "kvinna" ? 0.9 : 1.0;

  return Math.round(baseMET * userWeight * durationHours * ageMultiplier * sexMultiplier);
}
