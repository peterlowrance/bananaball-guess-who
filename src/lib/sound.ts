// Sound stub for Stage 5 — real Web Audio manager arrives in Stage 10 (juice).
// Keeping the call sites in place now so wiring is done once.
export type SoundName = 'correct' | 'wrong' | 'complete' | 'combo' | 'levelup';

export function playSound(_name: SoundName): void {
  // no-op until Stage 10
}

export function unlockAudio(): void {
  // no-op until Stage 10
}
