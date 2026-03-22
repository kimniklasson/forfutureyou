import { useState, useRef, useCallback, useEffect } from "react";

interface ActiveDrag {
  id: string;
  pointerId: number;
  fromIndex: number;
  overIndex: number;
}

/**
 * Zero-dependency drag-to-reorder hook using native Pointer Events.
 * - Long press (longPressDelay ms) anywhere on the item activates drag
 * - Touch-friendly: uses touchmove listener to detect scroll vs hold
 * - Live reorder preview as the pointer moves
 * - Commits new order on pointerup
 */
export function useDragSort<T extends { id: string }>(
  items: T[],
  onReorder: (newIds: string[]) => void,
  longPressDelay = 600
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef<ActiveDrag | null>(null);
  const preventScrollRef = useRef<((e: TouchEvent) => void) | null>(null);
  const cancelTouchRef = useRef<((e: TouchEvent) => void) | null>(null);
  const startYRef = useRef(0);

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      cleanupTouchListeners();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function cleanupTouchListeners() {
    if (preventScrollRef.current) {
      window.removeEventListener("touchmove", preventScrollRef.current);
      preventScrollRef.current = null;
    }
    if (cancelTouchRef.current) {
      window.removeEventListener("touchmove", cancelTouchRef.current);
      cancelTouchRef.current = null;
    }
  }

  function findOverIndex(clientY: number): number {
    if (!containerRef.current || !activeRef.current) return 0;
    const nodes = containerRef.current.querySelectorAll<HTMLElement>("[data-sort-id]");
    let best = activeRef.current.overIndex;
    let minDist = Infinity;
    nodes.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(clientY - center);
      if (dist < minDist) {
        minDist = dist;
        best = i;
      }
    });
    return best;
  }

  function cancelPendingTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    cleanupTouchListeners();
  }

  // Called from each item's onPointerDown
  const onItemPointerDown = useCallback((e: React.PointerEvent, id: string) => {
    if (activeRef.current) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA") return;

    const target = e.currentTarget as Element;
    const pointerId = e.pointerId;
    const fromIndex = items.findIndex((item) => item.id === id);
    startYRef.current = e.clientY;

    // On touch devices, listen for touchmove to cancel if user scrolls.
    // Pointer events may stop firing once the browser takes over for scroll.
    const cancelOnScroll = (te: TouchEvent) => {
      const dy = Math.abs(te.touches[0].clientY - startYRef.current);
      if (dy > 8) {
        cancelPendingTimer();
      }
    };
    cancelTouchRef.current = cancelOnScroll;
    window.addEventListener("touchmove", cancelOnScroll, { passive: true });

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      // Remove the cancel-on-scroll listener
      if (cancelTouchRef.current) {
        window.removeEventListener("touchmove", cancelTouchRef.current);
        cancelTouchRef.current = null;
      }

      const drag: ActiveDrag = { id, pointerId, fromIndex, overIndex: fromIndex };
      activeRef.current = drag;

      // Prevent scroll for the rest of this touch gesture
      const preventScroll = (te: TouchEvent) => {
        te.preventDefault();
        // Also update drag position from touch
        if (activeRef.current) {
          const newIndex = findOverIndex(te.touches[0].clientY);
          if (newIndex !== activeRef.current.overIndex) {
            activeRef.current.overIndex = newIndex;
            setOverIndex(newIndex);
          }
        }
      };
      preventScrollRef.current = preventScroll;
      window.addEventListener("touchmove", preventScroll, { passive: false });

      try {
        target.setPointerCapture(pointerId);
      } catch (_) {
        // setPointerCapture can throw if the pointer is no longer active
      }
      setDraggingId(id);
      setOverIndex(fromIndex);
    }, longPressDelay);
  }, [items, longPressDelay]);

  function onContainerPointerMove(e: React.PointerEvent) {
    if (!activeRef.current) return;
    const newIndex = findOverIndex(e.clientY);
    if (newIndex !== activeRef.current.overIndex) {
      activeRef.current.overIndex = newIndex;
      setOverIndex(newIndex);
    }
  }

  function onContainerPointerUp() {
    cancelPendingTimer();
    if (!activeRef.current) return;

    const { fromIndex, overIndex: toIndex } = activeRef.current;
    activeRef.current = null;
    setDraggingId(null);
    setOverIndex(null);

    if (toIndex !== fromIndex) {
      const reordered = [...items];
      const [removed] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, removed);
      onReorder(reordered.map((i) => i.id));
    }
  }

  const displayItems: T[] =
    draggingId !== null && overIndex !== null
      ? (() => {
          const fromIndex = items.findIndex((i) => i.id === draggingId);
          const reordered = [...items];
          const [removed] = reordered.splice(fromIndex, 1);
          reordered.splice(overIndex, 0, removed);
          return reordered;
        })()
      : items;

  const containerProps = {
    ref: containerRef,
    onPointerMove: onContainerPointerMove,
    onPointerUp: onContainerPointerUp,
    onPointerCancel: onContainerPointerUp,
  };

  const getItemProps = (id: string) => ({
    "data-sort-id": id,
    onPointerDown: (e: React.PointerEvent) => onItemPointerDown(e, id),
    style: { touchAction: "auto" } as React.CSSProperties,
  });

  return { draggingId, displayItems, containerProps, getItemProps };
}
