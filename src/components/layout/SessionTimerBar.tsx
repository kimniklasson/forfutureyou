import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../../stores/useSessionStore";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { useTimer } from "../../hooks/useTimer";
import { useRestTimer } from "../../hooks/useRestTimer";
import { formatTime, formatDuration } from "../../utils/formatTime";
import { calculateWorkoutTotals, calculateIntensity, calculateRestTimes, calculateCalories } from "../../utils/calculations";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { buildPBRecord, isSetPB } from "../../utils/personalBest";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { IconClose, IconCheck } from "../ui/icons";
import type { WorkoutSession } from "../../types/models";

interface PBSet {
  setNumber: number;
  reps: number;
  weight: number;
  exerciseName: string;
  isBodyweight: boolean;
}

export function SessionTimerBar() {
  const { activeSession, finishSession, cancelSession } = useSessionStore();
  const elapsed = useTimer();
  const restElapsed = useRestTimer();
  const navigate = useNavigate();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [finishedSession, setFinishedSession] = useState<WorkoutSession | null>(null);
  const allSessions = useHistoryStore((s) => s.sessions);
  const { userWeight, userAge, userSex, showCalories } = useSettingsStore();

  // Lock body scroll when summary modal is open
  useEffect(() => {
    if (finishedSession) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [finishedSession]);

  // Collect PB sets for the finished session
  const pbSets = useMemo(() => {
    if (!finishedSession) return [];
    const result: PBSet[] = [];
    // Build PB record from all sessions EXCEPT the finished one
    const priorSessions = allSessions.filter((s) => s.id !== finishedSession.id);
    for (const log of finishedSession.exerciseLogs) {
      let record = buildPBRecord(log.exerciseId, priorSessions);
      for (const set of log.sets) {
        if (isSetPB(set.reps, set.weight, record)) {
          result.push({
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
            exerciseName: log.exerciseName,
            isBodyweight: log.isBodyweight,
          });
          // Advance the record so subsequent sets are compared correctly
          if (set.weight > record.maxWeight) {
            record = { ...record, maxWeight: set.weight, maxRepsAtMaxWeight: set.reps };
          } else if (set.weight === record.maxWeight && set.reps > record.maxRepsAtMaxWeight) {
            record = { ...record, maxRepsAtMaxWeight: set.reps };
          }
          if (set.reps > record.maxRepsBodyweight) {
            record = { ...record, maxRepsBodyweight: set.reps };
          }
        }
      }
    }
    return result;
  }, [finishedSession, allSessions]);

  if (!activeSession && !finishedSession) return null;

  const handleFinish = async () => {
    const session = await finishSession();
    if (session) {
      setFinishedSession(session);
    }
  };

  const handleViewSession = () => {
    if (finishedSession) {
      const id = finishedSession.id;
      setFinishedSession(null);
      navigate(`/history/${id}`);
    }
  };

  // Summary data
  const summaryDuration = finishedSession?.finishedAt
    ? formatDuration(finishedSession.startedAt, finishedSession.finishedAt, finishedSession.pausedDuration)
    : "–";
  const totals = finishedSession ? calculateWorkoutTotals(finishedSession, userWeight) : null;

  const intensity = finishedSession ? calculateIntensity(finishedSession, userWeight) : null;
  const restData = finishedSession ? calculateRestTimes(finishedSession) : null;
  const calories = finishedSession
    ? calculateCalories(finishedSession, userWeight, userAge, userSex, intensity?.score)
    : 0;

  const avgRestDisplay = restData && (restData.interSetRests.length > 0 || restData.interExerciseRests.length > 0)
    ? `${Math.floor(restData.avgInterSetRestMs / 60000)}:${String(
        Math.floor((restData.avgInterSetRestMs % 60000) / 1000)
      ).padStart(2, "0")}`
    : "–";

  return (
    <>
    {activeSession && (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="mx-auto max-w-[600px] pointer-events-auto">
        <div
          className="flex items-center gap-2 px-6 pt-6 pb-30 transition-all duration-300 pointer-events-auto"
          style={{ backgroundColor: "rgba(255, 217, 0, 0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
        >
          {/* Cancel */}
          <button
            onClick={() => setConfirmCancel(true)}
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 pointer-events-auto"
            style={{ border: "1px solid rgba(0,0,0,0.1)" }}
          >
            <IconClose size={16} color="black" />
          </button>

          {/* Timer info */}
          <div className="flex-1 flex flex-col gap-2 items-center">
            <span className="font-bold text-[12px] uppercase tracking-wider text-black">
              TIMER
            </span>
            <span className="text-[31px] leading-[18px] text-black font-normal">
              {formatTime(elapsed)}
            </span>
            {restElapsed > 0 && (
              <span className="text-[12px] uppercase tracking-wider text-black/60 mt-1">
                VILA {formatTime(restElapsed)}
              </span>
            )}
          </div>

          {/* Finish */}
          <button
            onClick={handleFinish}
            className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shrink-0 pointer-events-auto"
          >
            <IconCheck size={16} />
          </button>
        </div>
      </div>
    </div>
    )}

    <ConfirmDialog
      isOpen={confirmCancel}
      message="Avbryta pågående pass? Dina loggade set sparas inte."
      cancelLabel="Nej"
      confirmLabel="Ja"
      onConfirm={() => { cancelSession(); setConfirmCancel(false); }}
      onCancel={() => setConfirmCancel(false)}
    />

    {/* Session summary modal */}
    {finishedSession && totals && (
      <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-backdrop" onClick={() => setFinishedSession(null)}>
        <div
          className="modal-content bg-white dark:bg-[#1c1c1e] rounded-modal w-[345px] max-h-[90vh] overflow-y-auto flex flex-col gap-8 py-10 px-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <div className="text-center flex flex-col gap-1">
            <p className="font-bold text-[20px] leading-[1.22]">Bra jobbat!</p>
            <p className="text-[20px] leading-[1.22] opacity-50">Här är en summering av passet.</p>
          </div>

          {/* Stats columns */}
          <div className="flex justify-around text-center">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] opacity-50">Tid</span>
              <span className="font-bold text-[15px]">{summaryDuration}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] opacity-50">Set</span>
              <span className="font-bold text-[15px]">{totals.totalSets} set</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] opacity-50">Reps</span>
              <span className="font-bold text-[15px]">{totals.totalReps} rep</span>
            </div>
          </div>

          {/* Intensity + rest + calories row */}
          <div className="flex justify-around text-center">
            {intensity && (
              <div className="flex flex-col gap-1">
                <span className="text-[13px] opacity-50">Intensitet</span>
                <span className="font-bold text-[15px]">{intensity.score}/100</span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-[13px] opacity-50">Snitt vila</span>
              <span className="font-bold text-[15px]">{avgRestDisplay}</span>
            </div>
            {showCalories && calories > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[13px] opacity-50">Kalorier</span>
                <span className="font-bold text-[15px]">{calories} kcal</span>
              </div>
            )}
          </div>

          {/* PB sets */}
          {pbSets.length > 0 && (
            <div className="flex flex-col gap-2">
              {pbSets.map((pb, i) => {
                const weightDisplay = pb.isBodyweight ? `+${pb.weight}` : String(pb.weight);
                return (
                  <div
                    key={i}
                    className="bg-accent text-black rounded-card flex items-center py-3 px-4 text-[15px] leading-[18px]"
                  >
                    <span className="flex-1 font-bold">S{pb.setNumber}</span>
                    <span className="flex-1 text-right">{pb.reps} rep</span>
                    <span className="flex-1 text-right">{weightDisplay} kg</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* View session button */}
          <button
            onClick={handleViewSession}
            className="w-full bg-black dark:bg-white text-white dark:text-black rounded-card px-6 py-5 text-[13px] font-bold uppercase tracking-wider"
          >
            Visa pass
          </button>
        </div>
      </div>
    )}
    </>
  );
}
