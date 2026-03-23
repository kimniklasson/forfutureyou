import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { formatShortDate } from "../../utils/formatDate";
import { formatDuration } from "../../utils/formatTime";
import { calculateWorkoutTotals, calculateIntensity, calculateRestTimes, calculateCalories } from "../../utils/calculations";
import { computeHistoricalPBTypes } from "../../utils/personalBest";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { IconTrash } from "../ui/icons";
import type { WorkoutSession } from "../../types/models";

// ─── Date / time helpers ────────────────────────────────────────────────────

function toDateInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function mergeDateIntoIso(existingIso: string, dateStr: string): string {
  const d = new Date(existingIso);
  const [y, mo, day] = dateStr.split("-").map(Number);
  d.setFullYear(y, mo - 1, day);
  return d.toISOString();
}

function mergeTimeIntoIso(existingIso: string, timeStr: string): string {
  const d = new Date(existingIso);
  const [h, min] = timeStr.split(":").map(Number);
  d.setHours(h, min, 0, 0);
  return d.toISOString();
}

// ─── Inline edit field ───────────────────────────────────────────────────────

interface InlineEditProps {
  displayValue: string;
  inputValue: string;
  onSave: (val: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  step?: string;
  className?: string;
  inputClassName?: string;
}

function InlineEdit({
  displayValue,
  inputValue,
  onSave,
  type = "text",
  inputMode,
  step,
  className = "",
  inputClassName = "",
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(inputValue);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      if (type === "text" || type === "number") ref.current?.select();
    }
  }, [editing, type]);

  const commit = () => {
    setEditing(false);
    if (draft !== inputValue) onSave(draft);
  };

  if (editing) {
    return (
      <input
        ref={ref}
        type={type}
        inputMode={inputMode}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setEditing(false); setDraft(inputValue); }
        }}
        className={`bg-transparent border-b border-current outline-none ${inputClassName}`}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(inputValue); setEditing(true); }}
      className={`cursor-text ${className}`}
    >
      {displayValue}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkoutDetailView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { loadSessions, updateSession } = useHistoryStore();
  const allSessions = useHistoryStore((state) => state.sessions);
  const { userWeight, userAge, userSex, showCalories } = useSettingsStore();
  const session = allSessions.find((s) => s.id === sessionId);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Compute PB flags for each exercise in this session
  const pbMap = useMemo(() => {
    const map = new Map<string, Map<string, "weight" | "reps">>();
    if (!session) return map;
    for (const log of session.exerciseLogs) {
      map.set(log.exerciseId, computeHistoricalPBTypes(log.exerciseId, allSessions));
    }
    return map;
  }, [session, allSessions]);

  if (!session) {
    return <p className="text-center opacity-50 pt-10">Träningspass hittades inte.</p>;
  }

  const duration = session.finishedAt
    ? formatDuration(session.startedAt, session.finishedAt, session.pausedDuration)
    : "–";

  const totals = calculateWorkoutTotals(session, userWeight);
  const intensity = calculateIntensity(session, userWeight);
  const restData = calculateRestTimes(session);
  const calories = calculateCalories(session, userWeight, userAge, userSex, intensity.score);

  const save = (updated: WorkoutSession) => updateSession(updated);

  const updateStartedAt = (iso: string) =>
    save({ ...session, startedAt: iso });

  const updateFinishedAt = (iso: string) =>
    save({ ...session, finishedAt: iso });

  const updateSet = (
    logIdx: number,
    setIdx: number,
    field: "reps" | "weight",
    rawVal: string
  ) => {
    const val = parseFloat(rawVal);
    if (isNaN(val) || val < 0) return;
    const newLogs = session.exerciseLogs.map((log, li) => {
      if (li !== logIdx) return log;
      const newSets = log.sets.map((s, si) =>
        si === setIdx
          ? { ...s, [field]: field === "reps" ? Math.round(val) : val }
          : s
      );
      return { ...log, sets: newSets };
    });
    save({ ...session, exerciseLogs: newLogs });
  };

  const deleteSet = (logIdx: number, setIdx: number) => {
    const newLogs = session.exerciseLogs
      .map((log, li) => {
        if (li !== logIdx) return log;
        const newSets = log.sets
          .filter((_, si) => si !== setIdx)
          .map((s, i) => ({ ...s, setNumber: i + 1 }));
        return { ...log, sets: newSets };
      })
      .filter((log) => log.sets.length > 0);
    save({ ...session, exerciseLogs: newLogs });
  };

  return (
    <div className="flex flex-col gap-8 px-2">

      {/* Session header */}
      <div className="flex flex-col gap-1 items-center text-center">
        <div className="flex flex-col">
          <InlineEdit
            displayValue={formatShortDate(session.startedAt)}
            inputValue={toDateInput(session.startedAt)}
            onSave={(v) => updateStartedAt(mergeDateIntoIso(session.startedAt, v))}
            type="date"
            className="text-[20px] font-bold leading-[25px]"
            inputClassName="text-[20px] font-bold leading-[25px] w-36"
          />
          <span className="text-[20px] leading-[25px]">{session.categoryName}</span>
        </div>
        <div className="flex items-center gap-1 text-[12px] uppercase tracking-wider opacity-50">
          <InlineEdit
            displayValue={toTimeInput(session.startedAt)}
            inputValue={toTimeInput(session.startedAt)}
            onSave={(v) => updateStartedAt(mergeTimeIntoIso(session.startedAt, v))}
            type="time"
            inputClassName="w-20 text-[12px] uppercase tracking-wider"
          />
          <span>–</span>
          {session.finishedAt ? (
            <InlineEdit
              displayValue={toTimeInput(session.finishedAt)}
              inputValue={toTimeInput(session.finishedAt)}
              onSave={(v) => updateFinishedAt(mergeTimeIntoIso(session.finishedAt!, v))}
              type="time"
              inputClassName="w-20 text-[12px] uppercase tracking-wider"
            />
          ) : (
            <span>–</span>
          )}
          <span className="ml-1">({duration})</span>
        </div>
      </div>

      {/* Exercise logs */}
      {session.exerciseLogs.map((log, logIdx) => (
        <div key={log.exerciseId} className="flex flex-col gap-2">
          <span className="font-bold text-[15px] leading-[18px]">{log.exerciseName}</span>
          <div className="flex flex-col">
            {log.sets.map((set, setIdx) => {
              const pbType = pbMap.get(log.exerciseId)?.get(set.completedAt);

              // Calculate rest time from previous set
              let restLabel: string | null = null;
              if (setIdx > 0 && set.startedAt) {
                const prevSet = log.sets[setIdx - 1];
                const restMs =
                  new Date(set.startedAt).getTime() -
                  new Date(prevSet.completedAt).getTime();
                if (restMs > 0) {
                  const mins = Math.floor(restMs / 60000);
                  const secs = Math.floor((restMs % 60000) / 1000);
                  restLabel = `${mins}:${String(secs).padStart(2, "0")}`;
                }
              }

              return (
              <div key={set.setNumber}>
                {restLabel && (
                  <div className="text-center text-[11px] opacity-30 py-0.5">
                    Vila: {restLabel}
                  </div>
                )}
                <div
                  className="flex items-center py-3 text-[15px] leading-[18px] border-b border-black/10 dark:border-white/20 last:border-0"
                >
                  <span className="flex-1 font-bold">S{set.setNumber}</span>

                  <span className="flex-1 text-right">
                    <span className={pbType === "reps" ? "bg-accent text-black rounded-full px-2 py-0.5" : ""}>
                      <InlineEdit
                        displayValue={String(set.reps)}
                        inputValue={String(set.reps)}
                        onSave={(v) => updateSet(logIdx, setIdx, "reps", v)}
                        type="number"
                        inputMode="numeric"
                        step="1"
                        inputClassName="w-10 text-right"
                      />{" rep"}
                    </span>
                  </span>

                  <span className="flex-1 text-right">
                    <span className={pbType === "weight" ? "bg-accent text-black rounded-full px-2 py-0.5" : ""}>
                      <InlineEdit
                        displayValue={
                          log.isBodyweight && set.weight > 0
                            ? `+${set.weight}`
                            : String(set.weight)
                        }
                        inputValue={String(set.weight)}
                        onSave={(v) => updateSet(logIdx, setIdx, "weight", v)}
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        inputClassName="w-12 text-right"
                      />{" kg"}
                    </span>
                  </span>

                  <button
                    onClick={() => deleteSet(logIdx, setIdx)}
                    className="w-8 flex items-center justify-end opacity-40 hover:opacity-100 active:opacity-100 transition-opacity"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Totals */}
      <div className="bg-card rounded-card p-4">
        <div className="flex px-6 py-3">
          <span className="w-[83px] font-bold text-[15px]">{totals.totalSets} set</span>
          <span className="w-[83px] text-[15px]">{totals.totalReps} rep</span>
          <span className="w-[83px] text-[15px]">{totals.totalWeight} kg</span>
        </div>
      </div>

      {/* Intensity card */}
      <div className="bg-card rounded-card p-4 flex flex-col gap-3">
        <div className="flex items-baseline gap-2 px-2">
          <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">Intensitet</span>
          <span className="text-[24px] font-bold">{intensity.score}</span>
          <span className="text-[15px] opacity-50">/ 100</span>
        </div>
        <div className="grid grid-cols-2 gap-2 px-2">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider opacity-40">Snitt vila</span>
            <span className="text-[15px]">
              {restData.interSetRests.length > 0
                ? `${Math.floor(restData.avgInterSetRestMs / 60000)}:${String(
                    Math.floor((restData.avgInterSetRestMs % 60000) / 1000)
                  ).padStart(2, "0")}`
                : "–"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider opacity-40">Volym/min</span>
            <span className="text-[15px]">{intensity.volumePerMinute} kg</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider opacity-40">Set/min</span>
            <span className="text-[15px]">{intensity.setDensity}</span>
          </div>
          {showCalories && calories > 0 && (
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider opacity-40">Kalorier</span>
              <span className="text-[15px]">{calories} kcal</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
