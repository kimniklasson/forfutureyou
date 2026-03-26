import { useEffect, type ReactNode } from "react";
import { IconClose } from "./icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, subtitle, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-backdrop"
      onClick={onClose}
    >
      <div
        className="modal-content bg-white dark:bg-card rounded-modal w-[345px] max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto flex flex-col gap-6 pt-6 pb-8 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 justify-center">
          <div className="w-10 h-10 shrink-0" />
          <div className="flex-1 text-center">
            <p className="font-bold text-[15px] leading-[1.22]">{title}</p>
            {subtitle && (
              <p className="text-[15px] leading-[1.22] opacity-50">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 shrink-0 flex items-center justify-center rounded-icon"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 flex flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
