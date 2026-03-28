import { useEffect } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "./icons";
import { Z } from "../../utils/zIndex";
import { acquireScrollLock, releaseScrollLock } from "../../utils/scrollLock";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export function InfoModal({ isOpen, onClose, title, description }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    acquireScrollLock();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => {
      releaseScrollLock();
      document.removeEventListener("keydown", handler);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-backdrop fixed inset-0 flex items-center justify-center bg-backdrop"
      style={{ zIndex: Z.MODAL }}
      onClick={onClose}
    >
      <div
        className="modal-content bg-white dark:bg-card rounded-modal w-[345px] max-w-[calc(100vw-2rem)] flex flex-col gap-6 pt-6 pb-8 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 justify-center">
          <div className="w-10 h-10 shrink-0" />
          <div className="flex-1 text-center">
            <p className="font-bold text-[15px] leading-[1.22]">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-icon"
          >
            <IconClose size={16} />
          </button>
        </div>
        <div className="px-4">
          <p className="text-[15px] leading-[1.5] opacity-70 text-center">{description}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
