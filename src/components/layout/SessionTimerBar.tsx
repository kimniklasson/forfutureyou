import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../../stores/useSessionStore";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { useTimer } from "../../hooks/useTimer";
import { formatTime, formatDuration } from "../../utils/formatTime";
import { calculateWorkoutTotals } from "../../utils/calculations";
import { computeHistoricalPBs } from "../../utils/personalBest";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Modal } from "../ui/Modal";
import { IconClose, IconCheck } from "../ui/icons";
import type { WorkoutSession } from "../../types/models";

export function SessionTimerBar() {
  const { activeSession, finishSession, cancelSession } = useSessionStore();
  const elapsed = useTimer();
  const navigate = useNavigate();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [finishedSession, setFinishedSession] = useState<WorkoutSession | null>(null);
  const allSessions = useHistoryStore((s) => s.sessions);

  // Compute PB count for the finished session
  const pbCount = useMemo(() => {
    if (!finishedSession) return 0;
    let count = 0;
    for (const log of finishedSession.exerciseLogs) {
      const pbTimestamps = computeHistoricalPBs(log.exerciseId, allSessions);
      for (const set of log.sets) {
        if (pbTimestamps.has(set.completedAt)) count++;
      }
    }
    return count;
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

  const handleCloseModal = () => {
    setFinishedSession(null);
  };

  // Summary data
  const summaryDuration = finishedSession?.finishedAt
    ? formatDuration(finishedSession.startedAt, finishedSession.finishedAt, finishedSession.pausedDuration)
    : "–";
  const totals = finishedSession ? calculateWorkoutTotals(finishedSession) : null;

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
      onConfirm={() => { cancelSession(); setConfirmCancel(false); }}
      onCancel={() => setConfirmCancel(false)}
    />

    {/* Session summary modal */}
    <Modal
      isOpen={finishedSession !== null}
      onClose={handleCloseModal}
      title="Bra jobbat!"
      subtitle="Här är en summering av passet."
    >
      {totals && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[15px]">
              <span className="opacity-50">Tid</span>
              <span className="font-bold">{summaryDuration}</span>
            </div>
            <div className="flex justify-between text-[15px]">
              <span className="opacity-50">Set</span>
              <span className="font-bold">{totals.totalSets} set</span>
            </div>
            <div className="flex justify-between text-[15px]">
              <span className="opacity-50">Reps</span>
              <span className="font-bold">{totals.totalReps} rep</span>
            </div>
            <div className="flex justify-between text-[15px]">
              <span className="opacity-50">Total vikt</span>
              <span className="font-bold">{totals.totalWeight} kg</span>
            </div>
          </div>

          {pbCount > 0 && (
            <div className="bg-accent text-black rounded-card px-4 py-3 text-center">
              <span className="font-bold text-[15px]">
                {pbCount} personbästa!
              </span>
            </div>
          )}

          <button
            onClick={handleViewSession}
            className="w-full bg-black dark:bg-white text-white dark:text-black rounded-card px-6 py-5 text-[13px] font-bold uppercase tracking-wider"
          >
            Visa pass
          </button>
        </div>
      )}
    </Modal>
    </>
  );
}
