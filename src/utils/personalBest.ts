import type { WorkoutSession, WorkoutSet } from "../types/models";

export interface PBRecord {
  maxWeight: number;
  maxRepsAtMaxWeight: number;
}

/** Check if a set beats the current PB record */
export function isSetPB(reps: number, weight: number, record: PBRecord): boolean {
  if (weight > record.maxWeight) return true;
  if (weight === record.maxWeight && reps > record.maxRepsAtMaxWeight) return true;
  return false;
}

/** Update a PB record with a new set (mutates nothing, returns new record) */
function advanceRecord(record: PBRecord, reps: number, weight: number): PBRecord {
  if (weight > record.maxWeight) {
    return { maxWeight: weight, maxRepsAtMaxWeight: reps };
  }
  if (weight === record.maxWeight && reps > record.maxRepsAtMaxWeight) {
    return { maxWeight: weight, maxRepsAtMaxWeight: reps };
  }
  return record;
}

/** Collect all sets for an exercise from sessions, sorted chronologically */
function collectSets(exerciseId: string, sessions: WorkoutSession[]): WorkoutSet[] {
  const sets: WorkoutSet[] = [];
  for (const session of sessions) {
    for (const log of session.exerciseLogs) {
      if (log.exerciseId === exerciseId) {
        sets.push(...log.sets);
      }
    }
  }
  return sets.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

/** Build PB record for an exercise from all completed sessions */
export function buildPBRecord(exerciseId: string, sessions: WorkoutSession[]): PBRecord {
  let record: PBRecord = { maxWeight: 0, maxRepsAtMaxWeight: 0 };
  const sets = collectSets(exerciseId, sessions);
  for (const set of sets) {
    record = advanceRecord(record, set.reps, set.weight);
  }
  return record;
}

/**
 * Compute which sets were PBs at the time they were logged.
 * Returns a Set of completedAt timestamps that were PBs.
 */
export function computeHistoricalPBs(
  exerciseId: string,
  allSessions: WorkoutSession[]
): Set<string> {
  const pbTimestamps = new Set<string>();
  let record: PBRecord = { maxWeight: 0, maxRepsAtMaxWeight: 0 };
  const sets = collectSets(exerciseId, allSessions);

  for (const set of sets) {
    if (isSetPB(set.reps, set.weight, record)) {
      pbTimestamps.add(set.completedAt);
      record = advanceRecord(record, set.reps, set.weight);
    }
  }

  return pbTimestamps;
}
