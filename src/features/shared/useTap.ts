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

export function useTap(handler: (() => void) | undefined, disabled?: boolean) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  // Guard so a synthetic click after our pointer-driven tap doesn't double-fire.
  const firedByPointer = useRef(false);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    firedByPointer.current = false;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }, []);

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const s = start.current;
      start.current = null;
      if (disabled || !handler || !s || s.id !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y);
      if (moved <= TAP_SLOP) {
        firedByPointer.current = true;
        handler();
      }
    },
    [handler, disabled],
  );

  const onClick = useCallback(() => {
    // Keyboard/mouse path (or a browser click we didn't already service).
    if (disabled || !handler) return;
    if (firedByPointer.current) {
      firedByPointer.current = false;
      return;
    }
    handler();
  }, [handler, disabled]);

  return { onPointerDown, onPointerUp, onClick };
}
