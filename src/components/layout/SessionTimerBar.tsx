import { useState } from "react";
import { useSessionStore } from "../../stores/useSessionStore";
import { useTimer } from "../../hooks/useTimer";
import { formatTime } from "../../utils/formatTime";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { IconClose, IconPlay, IconPause, IconCheck } from "../ui/icons";

export function SessionTimerBar() {
  const { activeSession, isPaused, togglePause, finishSession, cancelSession } = useSessionStore();
  const elapsed = useTimer();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!activeSession) return null;

  return (
    <>
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-[600px] pointer-events-auto">
        <div
          className="flex items-center gap-2 p-6 backdrop-blur-lg transition-all duration-300"
          style={{ backgroundColor: "rgba(255, 217, 0, 0.7)" }}
        >
          {/* Cancel */}
          <button
            onClick={() => setConfirmCancel(true)}
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ border: "1px solid rgba(0,0,0,0.1)" }}
          >
            <IconClose size={16} color="black" />
          </button>

          {/* Timer info */}
          <div className="flex-1 flex flex-col gap-2 px-2">
            <span className="font-bold text-[12px] uppercase tracking-wider text-black">
              TIMER
            </span>
            <span className="text-[31px] leading-[18px] text-black font-normal">
              {formatTime(elapsed)}
            </span>
          </div>

          {/* Pause / Play */}
          <button
            onClick={togglePause}
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0"
          >
            {isPaused ? <IconPlay size={16} /> : <IconPause size={16} />}
          </button>

          {/* Finish */}
          <button
            onClick={finishSession}
            className="w-12 h-12 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0"
          >
            <IconCheck size={16} />
          </button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      isOpen={confirmCancel}
      message="Avbryta pågående pass? Dina loggade set sparas inte."
      onConfirm={() => { cancelSession(); setConfirmCancel(false); }}
      onCancel={() => setConfirmCancel(false)}
    />
    </>
  );
}
