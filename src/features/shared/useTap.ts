// Touch-tolerant tap handler. On mobile, the browser only fires a `click` when
// pointerdown and pointerup land on the same element without much movement — a
// slight finger slide cancels it, which makes quiz choices feel unresponsive.
// This tracks the pointer between down and up and fires the handler as long as
// the finger didn't travel past a small threshold, so a tiny slide still counts
// as a tap. Falls back to onClick for keyboard/mouse activation.
import { useRef, useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

// How far (px) a pointer may move between down and up and still count as a tap.
const TAP_SLOP = 16;

// After we service a tap on pointerup, the browser still dispatches a synthetic
// `click`. If our handler mutated the layout (e.g. a tile moves between the bank
// and the answer row), that click can land on a DIFFERENT element that slid
// under the finger — causing a phantom second selection. We can't guard this
// per-element, so we suppress ALL clicks for a short window after any
// pointer-driven tap, module-wide. Real keyboard/mouse clicks never follow a
// pointerup this closely, so they're unaffected.
let suppressClicksUntil = 0;
const CLICK_SUPPRESS_MS = 400;
// now() without Date.now (unavailable in some sandboxes): performance.now is fine.
const now = () =>
  typeof performance !== 'undefined' && performance.now ? performance.now() : 0;

export function useTap(handler: (() => void) | undefined, disabled?: boolean) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }, []);

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const s = start.current;
      start.current = null;
      if (disabled || !handler || !s || s.id !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y);
      if (moved <= TAP_SLOP) {
        // Swallow the synthetic click that follows this pointerup (and any
        // stray click on a reflowed neighbor) for a brief window.
        suppressClicksUntil = now() + CLICK_SUPPRESS_MS;
        handler();
      }
    },
    [handler, disabled],
  );

  const onClick = useCallback(() => {
    if (disabled || !handler) return;
    // Skip clicks that trail a pointer-driven tap — this includes the phantom
    // click that lands on whatever element reflowed under the finger.
    if (now() < suppressClicksUntil) return;
    handler();
  }, [handler, disabled]);

  return { onPointerDown, onPointerUp, onClick };
}
