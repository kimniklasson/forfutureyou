import { useEffect, useState } from "react";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { CompletedWorkoutItem } from "./CompletedWorkoutItem";
import { ConfirmDialog } from "../ui/ConfirmDialog";

export function CompletedWorkoutsList() {
  const { loadSessions, getGroupedByMonth, deleteSession } = useHistoryStore();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const groups = getGroupedByMonth();
  const isEmpty = groups.length === 0;

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteSession(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Header text */}
      <div className="flex flex-col items-center text-center">
        <span className="text-[20px] font-bold leading-[1.22]">Träningspass</span>
        <span className="text-[20px] leading-[1.22] opacity-50">
          Här hittar du alla dina genomförda träningspass
        </span>
      </div>

      {isEmpty && (
        <p className="text-[15px] opacity-50 text-center pt-4">
          Inga träningspass ännu.
        </p>
      )}

      {/* Month groups */}
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <span className="font-bold text-[12px] uppercase tracking-wider">
            {group.label}
          </span>
          <div className="flex flex-col gap-2">
            {group.sessions.map((session) => (
              <CompletedWorkoutItem
                key={session.id}
                session={session}
                onDelete={setDeleteId}
              />
            ))}
          </div>
        </div>
      ))}

      <ConfirmDialog
        isOpen={deleteId !== null}
        message="Är du säker på att du vill ta bort detta träningspass?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
