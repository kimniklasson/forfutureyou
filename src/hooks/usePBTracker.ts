import { useMemo, useRef } from "react";
import { useHistoryStore } from "../stores/useHistoryStore";
import { useSessionStore } from "../stores/useSessionStore";
import { buildPBRecord, isSetPB, type PBRecord } from "../utils/personalBest";

export function usePBTracker(exerciseId: string) {
  const historySessions = useHistoryStore((s) => s.sessions);
  const activeSession = useSessionStore((s) => s.activeSession);
  const recordRef = useRef<PBRecord>({ maxWeight: 0, maxRepsAtMaxWeight: 0, maxRepsBodyweight: 0 });

  // Build PB record from history + active session sets logged so far
  const { record, pbSetNumbers } = useMemo(() => {
    // Start from completed sessions
    let rec = buildPBRecord(exerciseId, historySessions);

    // Include sets from active session to track PBs within the same workout
    const activeSets =
      activeSession?.exerciseLogs.find((l) => l.exerciseId === exerciseId)?.sets ?? [];

    const pbs = new Set<number>();
    for (const set of activeSets) {
      if (isSetPB(set.reps, set.weight, rec)) {
        pbs.add(set.setNumber);
        // Advance record so subsequent sets are compared against updated PB
        if (set.weight > rec.maxWeight) {
          rec = { maxWeight: set.weight, maxRepsAtMaxWeight: set.reps };
        } else if (set.weight === rec.maxWeight && set.reps > rec.maxRepsAtMaxWeight) {
          rec = { ...rec, maxRepsAtMaxWeight: set.reps };
        }
      }
    }

    recordRef.current = rec;
    return { record: rec, pbSetNumbers: pbs };
  }, [exerciseId, historySessions, activeSession]);

  /** Check if these values would be a PB (call BEFORE logSet) */
  function checkIfPB(reps: number, weight: number): boolean {
    return isSetPB(reps, weight, recordRef.current);
  }

  return { record, pbSetNumbers, checkIfPB };
}
