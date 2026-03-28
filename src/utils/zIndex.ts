/**
 * Centralized z-index scale.
 * Tailwind classes reference these via `z-[${value}]` or inline styles.
 * CSS classes (index.css) should use the same numeric values.
 *
 * Scale:
 *   10  – dragged item (above siblings)
 *   40  – sticky bars (session timer)
 *   45  – FFY floating text (between bar and modals, defined in CSS)
 *   50  – overlays / confirm dialogs
 *   70  – modals
 *   200 – critical confirms (swipe-to-delete)
 */
export const Z = {
  DRAG_ITEM: 10,
  STICKY_BAR: 40,
  /** "For future you." floating text — used in index.css */
  FFY_TEXT: 45,
  OVERLAY: 50,
  MODAL: 70,
  CRITICAL_CONFIRM: 200,
} as const;

/** Progressive blur layers used by Header and BottomNav for edge fade effects. */
export const BLUR_LAYERS = [
  { blur: "16px", stop: "25%" },
  { blur: "12px", stop: "50%" },
  { blur: "8px",  stop: "75%" },
  { blur: "4px",  stop: "100%" },
] as const;
