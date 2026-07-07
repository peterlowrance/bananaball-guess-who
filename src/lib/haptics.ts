// Vibration haptics (Android; iOS Safari ignores navigator.vibrate). Gated by
// the user's haptics setting at the call site.
export function haptic(pattern: 'correct' | 'wrong' | 'tap'): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  const map = { correct: 15, wrong: [30, 50, 30] as number[], tap: 8 };
  try {
    navigator.vibrate(map[pattern]);
  } catch {
    /* ignore */
  }
}
