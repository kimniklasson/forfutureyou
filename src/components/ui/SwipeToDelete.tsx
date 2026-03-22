import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconTrash, IconDuplicate } from "./icons";

interface SwipeActionsProps {
  children: ReactNode;
  onDelete: () => void;
  onDuplicate?: () => void;
  confirmMessage: string;
}

export function SwipeActions({ children, onDelete, onDuplicate, confirmMessage }: SwipeActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const directionLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const getThreshold = useCallback(() => {
    return window.innerWidth * 0.5;
  }, []);

  const resetPosition = useCallback(() => {
    setIsAnimating(true);
    setOffsetX(0);
    setTimeout(() => setIsAnimating(false), 300);
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (showConfirm) return;
    startXRef.current = clientX;
    startYRef.current = clientY;
    currentXRef.current = 0;
    isDraggingRef.current = false;
    isPointerDownRef.current = true;
    directionLockedRef.current = null;
    setIsAnimating(false);
  }, [showConfirm]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (showConfirm || !isPointerDownRef.current) return;
    const deltaX = clientX - startXRef.current;
    const deltaY = clientY - startYRef.current;

    // Lock direction after a small movement threshold
    if (!directionLockedRef.current) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      directionLockedRef.current = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
    }

    // If vertical scroll, don't interfere
    if (directionLockedRef.current === "vertical") return;

    // If no duplicate handler, block rightward movement entirely
    const clampedDeltaX = !onDuplicate && deltaX > 0 ? 0 : deltaX;

    isDraggingRef.current = true;
    currentXRef.current = clampedDeltaX;
    setOffsetX(clampedDeltaX);
  }, [showConfirm]);

  const handleEnd = useCallback(() => {
    if (showConfirm) return;
    isPointerDownRef.current = false;
    directionLockedRef.current = null;
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const threshold = getThreshold();
    const delta = currentXRef.current;

    if (delta < 0 && Math.abs(delta) >= threshold) {
      // Swiped left past threshold → show delete confirm
      setShowConfirm(true);
    } else if (delta > 0 && delta >= threshold && onDuplicate) {
      // Swiped right past threshold → duplicate immediately
      resetPosition();
      onDuplicate();
    } else {
      resetPosition();
    }
  }, [showConfirm, getThreshold, resetPosition, onDuplicate]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };
    const handleMouseUp = () => {
      handleEnd();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMove, handleEnd]);

  const handleConfirm = useCallback(() => {
    setShowConfirm(false);
    onDelete();
    setOffsetX(0);
  }, [onDelete]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
    resetPosition();
  }, [resetPosition]);

  const swipingLeft = offsetX < 0;
  const swipingRight = offsetX > 0;
  const progress = Math.min(Math.abs(offsetX) / getThreshold(), 1);
  const bgOpacity = 0.3 + progress * 0.7;

  return (
    <>
      <div ref={containerRef} className="relative overflow-hidden rounded-card" style={{ margin: "-2px", padding: "2px" }}>
        {/* Red background for delete (swipe left) */}
        {(swipingLeft || showConfirm) && (
          <div
            className="absolute inset-0 flex items-center justify-end rounded-card"
            style={{
              backgroundColor: `rgba(239, 68, 68, ${bgOpacity})`,
              paddingRight: Math.max(16, Math.abs(offsetX) / 2 - 8),
            }}
          >
            <IconTrash size={24} color="white" />
          </div>
        )}

        {/* Yellow background for duplicate (swipe right) */}
        {swipingRight && onDuplicate && (
          <div
            className="absolute inset-0 flex items-center justify-start rounded-card"
            style={{
              backgroundColor: `rgba(234, 179, 8, ${bgOpacity})`,
              paddingLeft: Math.max(16, Math.abs(offsetX) / 2 - 8),
            }}
          >
            <IconDuplicate size={24} color="white" />
          </div>
        )}

        {/* Swipeable card content */}
        <div
          ref={contentRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          style={{
            transform: `translateX(${offsetX}px)`,
            transition: isAnimating ? "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
            userSelect: "none",
          }}
        >
          {children}
        </div>
      </div>

      {/* Delete confirm dialog — rendered in a portal so it always appears above all other UI */}
      {showConfirm && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-backdrop"
          onClick={handleCancel}
        >
          <div
            className="bg-white dark:bg-[#1c1c1e] rounded-modal w-[300px] p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[15px] text-center">{confirmMessage}</p>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex-1 py-3 px-4 rounded-button bg-card text-[12px] font-bold uppercase tracking-wider"
              >
                Avbryt
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 rounded-button bg-red-500 text-white text-[12px] font-bold uppercase tracking-wider"
              >
                Ta bort
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Keep backward-compatible export
export { SwipeActions as SwipeToDelete };
