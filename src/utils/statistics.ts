import type { WorkoutSession } from "../types/models";
import { calculateWorkoutTotals } from "./calculations";
import { computeHistoricalPBs } from "./personalBest";

// ── Types ──────────────────────────────────────────────────

export interface ExercisePR {
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
  maxWeight: number;
  maxRepsAtMaxWeight: number;
  estimated1RM: number;
  maxRepsBodyweight: number;
}

export interface SessionRecord {
  sessionId: string;
  date: string;
  value: number;
  label: string;
}

export interface WeeklyPoint {
  weekKey: string;   // "2026-W12"
  label: string;     // "v12"
  value: number;
}

export interface MonthlyPoint {
  monthKey: string;  // "2026-03"
  label: string;     // "Mar"
  value: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  mostWorkoutsInWeek: number;
  mostWorkoutsInMonth: number;
  avgWorkoutsPerWeek4w: number;
  avgWorkoutsPerWeekAllTime: number;
  favoriteDay: string;
}

export interface SessionStats {
  avgDurationMs: number;
  avgPauseDurationMs: number;
  totalTrainingTimeMs: number;
  totalKgAllTime: number;
}

export interface ExerciseInsight {
  mostTrainedExercise: { name: string; totalSets: number } | null;
  mostNeglectedExercise: { name: string; daysSinceLastLogged: number } | null;
  exerciseVarietyScore: number;
  categoryBalance: { categoryName: string; sessionCount: number }[];
}

export interface Badge {
  label: string;
  count: number;
  achieved: boolean;
}

export interface FunStats {
  badges: Badge[];
  totalKgInCars: number;
  totalKgInElephants: number;
  daysSinceFirstWorkout: number;
  pbCountThisMonth: number;
  pbCountLastMonth: number;
}

// ── Helpers ────────────────────────────────────────────────

const SWEDISH_DAYS = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];

function getSessionDurationMs(session: WorkoutSession): number {
  if (!session.finishedAt) return 0;
  const start = new Date(session.startedAt).getTime();
  const end = new Date(session.finishedAt).getTime();
  return Math.max(0, end - start - (session.pausedDuration || 0));
}

function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

// ── Personal Records ───────────────────────────────────────

export function computeExercisePRs(sessions: WorkoutSession[]): ExercisePR[] {
  const map = new Map<string, {
    exerciseName: string;
    isBodyweight: boolean;
    maxWeight: number;
    maxRepsAtMaxWeight: number;
    maxRepsBodyweight: number;
    bestRepsForEpley: number;
    bestWeightForEpley: number;
  }>();

  for (const session of sessions) {
    for (const log of session.exerciseLogs) {
      let entry = map.get(log.exerciseId);
      if (!entry) {
        entry = {
          exerciseName: log.exerciseName,
          isBodyweight: log.isBodyweight,
          maxWeight: 0,
          maxRepsAtMaxWeight: 0,
          maxRepsBodyweight: 0,
          bestRepsForEpley: 0,
          bestWeightForEpley: 0,
        };
        map.set(log.exerciseId, entry);
      }

      for (const set of log.sets) {
        // Max weight tracking
        if (set.weight > entry.maxWeight) {
          entry.maxWeight = set.weight;
          entry.maxRepsAtMaxWeight = set.reps;
        } else if (set.weight === entry.maxWeight && set.reps > entry.maxRepsAtMaxWeight) {
          entry.maxRepsAtMaxWeight = set.reps;
        }

        // Best estimated 1RM tracking (find the set that produces highest 1RM)
        const est = set.weight * (1 + set.reps / 30);
        const currentBest = entry.bestWeightForEpley * (1 + entry.bestRepsForEpley / 30);
        if (est > currentBest) {
          entry.bestWeightForEpley = set.weight;
          entry.bestRepsForEpley = set.reps;
        }

        // Bodyweight max reps
        if (log.isBodyweight && set.reps > entry.maxRepsBodyweight) {
          entry.maxRepsBodyweight = set.reps;
        }
      }
    }
  }

  const result: ExercisePR[] = [];
  for (const [exerciseId, e] of map) {
    const estimated1RM = e.bestWeightForEpley > 0
      ? Math.round(e.bestWeightForEpley * (1 + e.bestRepsForEpley / 30) * 10) / 10
      : 0;
    result.push({
      exerciseId,
      exerciseName: e.exerciseName,
      isBodyweight: e.isBodyweight,
      maxWeight: e.maxWeight,
      maxRepsAtMaxWeight: e.maxRepsAtMaxWeight,
      estimated1RM,
      maxRepsBodyweight: e.maxRepsBodyweight,
    });
  }

  return result.sort((a, b) => b.maxWeight - a.maxWeight);
}

export function computeVolumeRecord(sessions: WorkoutSession[]): SessionRecord | null {
  let best: SessionRecord | null = null;
  for (const s of sessions) {
    const { totalWeight } = calculateWorkoutTotals(s);
    if (!best || totalWeight > best.value) {
      best = { sessionId: s.id, date: s.startedAt, value: totalWeight, label: "kg" };
    }
  }
  return best;
}

export function computeMostSetsRecord(sessions: WorkoutSession[]): SessionRecord | null {
  let best: SessionRecord | null = null;
  for (const s of sessions) {
    const { totalSets } = calculateWorkoutTotals(s);
    if (!best || totalSets > best.value) {
      best = { sessionId: s.id, date: s.startedAt, value: totalSets, label: "set" };
    }
  }
  return best;
}

export function computeLongestWorkout(sessions: WorkoutSession[]): SessionRecord | null {
  let best: SessionRecord | null = null;
  for (const s of sessions) {
    const duration = getSessionDurationMs(s);
    if (duration > 0 && (!best || duration > best.value)) {
      best = { sessionId: s.id, date: s.startedAt, value: duration, label: "min" };
    }
  }
  return best;
}

// ── Progress Over Time ─────────────────────────────────────

export function computeWeightProgression(exerciseId: string, sessions: WorkoutSession[]): WeeklyPoint[] {
  const weekMap = new Map<string, number>();

  for (const session of sessions) {
    for (const log of session.exerciseLogs) {
      if (log.exerciseId !== exerciseId) continue;
      for (const set of log.sets) {
        const weekKey = getISOWeekKey(new Date(set.completedAt));
        const current = weekMap.get(weekKey) || 0;
        if (set.weight > current) weekMap.set(weekKey, set.weight);
      }
    }
  }

  return Array.from(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, value]) => ({
      weekKey,
      label: "v" + weekKey.split("-W")[1],
      value,
    }));
}

export function computeRepsProgression(exerciseId: string, sessions: WorkoutSession[]): WeeklyPoint[] {
  const weekMap = new Map<string, number>();

  for (const session of sessions) {
    for (const log of session.exerciseLogs) {
      if (log.exerciseId !== exerciseId) continue;
      for (const set of log.sets) {
        const weekKey = getISOWeekKey(new Date(set.completedAt));
        const current = weekMap.get(weekKey) || 0;
        if (set.reps > current) weekMap.set(weekKey, set.reps);
      }
    }
  }

  return Array.from(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, value]) => ({
      weekKey,
      label: "v" + weekKey.split("-W")[1],
      value,
    }));
}

export function computeVolumeProgression(sessions: WorkoutSession[]): MonthlyPoint[] {
  const monthMap = new Map<string, number>();

  for (const session of sessions) {
    const { totalWeight } = calculateWorkoutTotals(session);
    const monthKey = getMonthKey(new Date(session.startedAt));
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + totalWeight);
  }

  return Array.from(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, value]) => {
      const monthIdx = parseInt(monthKey.split("-")[1], 10) - 1;
      return { monthKey, label: SHORT_MONTHS[monthIdx], value };
    });
}

// ── Per-event progression ─────────────────────────────────

export interface EventPoint {
  date: string;   // ISO date from session.startedAt
  label: string;  // short Swedish date e.g. "21 mar"
  value: number;
}

export function computeEventProgression(
  exerciseId: string,
  sessions: WorkoutSession[],
  isBodyweight: boolean
): EventPoint[] {
  const points: EventPoint[] = [];

  for (const session of sessions) {
    for (const log of session.exerciseLogs) {
      if (log.exerciseId !== exerciseId) continue;
      let best = 0;
      for (const set of log.sets) {
        const v = isBodyweight ? set.reps : set.weight;
        if (v > best) best = v;
      }
      if (best > 0) {
        const d = new Date(session.startedAt);
        const label = `${d.getDate()} ${SHORT_MONTHS[d.getMonth()].toLowerCase()}`;
        points.push({ date: session.startedAt, label, value: best });
      }
    }
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export function computeEventVolume(
  exerciseId: string,
  sessions: WorkoutSession[],
  isBodyweight: boolean,
  userWeight: number = 0
): EventPoint[] {
  const points: EventPoint[] = [];

  for (const session of sessions) {
    for (const log of session.exerciseLogs) {
      if (log.exerciseId !== exerciseId) continue;
      let total = 0;
      for (const set of log.sets) {
        total += isBodyweight
          ? (userWeight + set.weight) * set.reps
          : set.weight * set.reps;
      }
      if (total > 0) {
        const d = new Date(session.startedAt);
        const label = `${d.getDate()} ${SHORT_MONTHS[d.getMonth()].toLowerCase()}`;
        points.push({ date: session.startedAt, label, value: total });
      }
    }
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

// ── Streaks & Consistency ──────────────────────────────────

export function computeStreaks(sessions: WorkoutSession[]): StreakInfo {
  if (sessions.length === 0) {
    return {
      currentStreak: 0, longestStreak: 0, mostWorkoutsInWeek: 0,
      mostWorkoutsInMonth: 0, avgWorkoutsPerWeek4w: 0, avgWorkoutsPerWeekAllTime: 0,
      favoriteDay: "-",
    };
  }

  // Group by week and month
  const weekCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();
  const dayCounts = new Array(7).fill(0);

  for (const s of sessions) {
    const d = new Date(s.startedAt);
    const wk = getISOWeekKey(d);
    weekCounts.set(wk, (weekCounts.get(wk) || 0) + 1);
    const mk = getMonthKey(d);
    monthCounts.set(mk, (monthCounts.get(mk) || 0) + 1);
    dayCounts[d.getDay()]++;
  }

  // Streaks — consecutive weeks
  const sortedWeeks = Array.from(weekCounts.keys()).sort();
  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;

  // Generate all weeks between first and last
  const allWeeks: string[] = [];
  if (sortedWeeks.length > 0) {
    const firstDate = mondayOfWeek(sortedWeeks[0]);
    const now = new Date();
    const currentWeek = getISOWeekKey(now);
    const lastDate = mondayOfWeek(currentWeek);
    const d = new Date(firstDate);
    while (d <= lastDate) {
      allWeeks.push(getISOWeekKey(d));
      d.setDate(d.getDate() + 7);
    }
  }

  for (let i = 0; i < allWeeks.length; i++) {
    if (weekCounts.has(allWeeks[i])) {
      streak++;
      if (streak > longestStreak) longestStreak = streak;
    } else {
      streak = 0;
    }
  }
  // Current streak: count backwards from current week
  currentStreak = 0;
  for (let i = allWeeks.length - 1; i >= 0; i--) {
    if (weekCounts.has(allWeeks[i])) {
      currentStreak++;
    } else {
      break;
    }
  }

  const mostWorkoutsInWeek = Math.max(...weekCounts.values(), 0);
  const mostWorkoutsInMonth = Math.max(...monthCounts.values(), 0);

  // Avg per week — last 4 weeks
  const now = new Date();
  let last4wCount = 0;
  for (let i = 0; i < 4; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const wk = getISOWeekKey(d);
    last4wCount += weekCounts.get(wk) || 0;
  }
  const avgWorkoutsPerWeek4w = Math.round((last4wCount / 4) * 10) / 10;

  const totalWeeks = Math.max(allWeeks.length, 1);
  const avgWorkoutsPerWeekAllTime = Math.round((sessions.length / totalWeeks) * 10) / 10;

  // Favorite day
  const maxDayCount = Math.max(...dayCounts);
  const favDayIdx = dayCounts.indexOf(maxDayCount);
  const favoriteDay = SWEDISH_DAYS[favDayIdx];

  return {
    currentStreak, longestStreak, mostWorkoutsInWeek,
    mostWorkoutsInMonth, avgWorkoutsPerWeek4w, avgWorkoutsPerWeekAllTime,
    favoriteDay,
  };
}

function mondayOfWeek(weekKey: string): Date {
  const [yearStr, weekStr] = weekKey.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

// ── Session Stats ──────────────────────────────────────────

export function computeSessionStats(sessions: WorkoutSession[]): SessionStats {
  if (sessions.length === 0) {
    return { avgDurationMs: 0, avgPauseDurationMs: 0, totalTrainingTimeMs: 0, totalKgAllTime: 0 };
  }

  let totalDuration = 0;
  let totalPause = 0;
  let totalKg = 0;

  for (const s of sessions) {
    totalDuration += getSessionDurationMs(s);
    totalPause += s.pausedDuration || 0;
    totalKg += calculateWorkoutTotals(s).totalWeight;
  }

  return {
    avgDurationMs: totalDuration / sessions.length,
    avgPauseDurationMs: totalPause / sessions.length,
    totalTrainingTimeMs: totalDuration,
    totalKgAllTime: totalKg,
  };
}

// ── Exercise Insights ──────────────────────────────────────

export function computeExerciseInsights(
  sessions: WorkoutSession[],
  allExercises: { id: string; name: string }[]
): ExerciseInsight {
  // Most trained: count total sets per exercise
  const setsByExercise = new Map<string, { name: string; totalSets: number }>();
  const lastLoggedByExercise = new Map<string, Date>();
  const recentExercises = new Set<string>();
  const categoryCounts = new Map<string, number>();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  for (const s of sessions) {
    // Category balance
    categoryCounts.set(s.categoryName, (categoryCounts.get(s.categoryName) || 0) + 1);

    const sessionDate = new Date(s.startedAt);

    for (const log of s.exerciseLogs) {
      // Total sets
      const entry = setsByExercise.get(log.exerciseId) || { name: log.exerciseName, totalSets: 0 };
      entry.totalSets += log.sets.length;
      setsByExercise.set(log.exerciseId, entry);

      // Last logged
      const prev = lastLoggedByExercise.get(log.exerciseId);
      if (!prev || sessionDate > prev) {
        lastLoggedByExercise.set(log.exerciseId, sessionDate);
      }

      // Variety (last 30 days)
      if (sessionDate >= thirtyDaysAgo) {
        recentExercises.add(log.exerciseId);
      }
    }
  }

  // Most trained
  let mostTrainedExercise: { name: string; totalSets: number } | null = null;
  for (const entry of setsByExercise.values()) {
    if (!mostTrainedExercise || entry.totalSets > mostTrainedExercise.totalSets) {
      mostTrainedExercise = entry;
    }
  }

  // Most neglected — only among exercises that still exist in categories
  let mostNeglectedExercise: { name: string; daysSinceLastLogged: number } | null = null;
  for (const ex of allExercises) {
    const lastDate = lastLoggedByExercise.get(ex.id);
    if (!lastDate) {
      // Never logged — ultimate neglect, but only if categories have it
      mostNeglectedExercise = { name: ex.name, daysSinceLastLogged: Infinity };
    } else {
      const days = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
      if (!mostNeglectedExercise || days > mostNeglectedExercise.daysSinceLastLogged) {
        mostNeglectedExercise = { name: ex.name, daysSinceLastLogged: days };
      }
    }
  }

  // Category balance
  const categoryBalance = Array.from(categoryCounts)
    .map(([categoryName, sessionCount]) => ({ categoryName, sessionCount }))
    .sort((a, b) => b.sessionCount - a.sessionCount);

  return {
    mostTrainedExercise,
    mostNeglectedExercise,
    exerciseVarietyScore: recentExercises.size,
    categoryBalance,
  };
}

// ── Fun / Motivational ─────────────────────────────────────

const BADGE_MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

export function computeFunStats(sessions: WorkoutSession[]): FunStats {
  const total = sessions.length;

  const badges: Badge[] = BADGE_MILESTONES.map((count) => ({
    label: `${count}`,
    count,
    achieved: total >= count,
  }));

  // Total kg
  let totalKg = 0;
  for (const s of sessions) {
    totalKg += calculateWorkoutTotals(s).totalWeight;
  }

  // Days since first workout
  let daysSinceFirstWorkout = 0;
  if (sessions.length > 0) {
    const sorted = sessions.map((s) => new Date(s.startedAt).getTime()).sort((a, b) => a - b);
    daysSinceFirstWorkout = Math.floor((Date.now() - sorted[0]) / 86400000);
  }

  // PB counts this month vs last month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Collect all unique exercise IDs
  const exerciseIds = new Set<string>();
  for (const s of sessions) {
    for (const log of s.exerciseLogs) {
      exerciseIds.add(log.exerciseId);
    }
  }

  let pbCountThisMonth = 0;
  let pbCountLastMonth = 0;

  for (const exId of exerciseIds) {
    const pbTimestamps = computeHistoricalPBs(exId, sessions);
    for (const ts of pbTimestamps) {
      const d = new Date(ts);
      if (d >= thisMonthStart) pbCountThisMonth++;
      else if (d >= lastMonthStart && d < thisMonthStart) pbCountLastMonth++;
    }
  }

  return {
    badges,
    totalKgInCars: Math.round((totalKg / 1500) * 10) / 10,
    totalKgInElephants: Math.round((totalKg / 5000) * 10) / 10,
    daysSinceFirstWorkout,
    pbCountThisMonth,
    pbCountLastMonth,
  };
}
