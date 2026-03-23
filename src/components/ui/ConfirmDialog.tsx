interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ isOpen, message, confirmLabel = "Ta bort", cancelLabel = "Avbryt", onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-card rounded-modal w-[300px] p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[15px] text-center">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-button bg-card text-[12px] font-bold uppercase tracking-wider"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-button bg-black dark:bg-white text-white dark:text-black text-[12px] font-bold uppercase tracking-wider"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
