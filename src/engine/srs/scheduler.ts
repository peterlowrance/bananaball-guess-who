// Leitner 6-box spaced repetition. Pure: (record, now, rng) -> record.
// See plan §3.1. Clock (`now`) and `rng` are injected for determinism.

import type { Rng } from '../rng';
import { newSrsRecord, type SrsRecord } from './types';

export const MAX_BOX = 5;
const DAY = 24 * 60 * 60 * 1000;

/** Review interval per box, in ms. Box 0 is same-lesson (0). */
export const BOX_INTERVALS: readonly number[] = [
  0, // 0 new
  1 * DAY, // 1 seedling
  3 * DAY, // 2 learning
  7 * DAY, // 3 familiar
  16 * DAY, // 4 strong
  35 * DAY, // 5 mastered (maintenance)
];

const CONFUSION_CAP = 6;

/** ±10% jitter so reviews don't clump. Deterministic via rng. */
function jitter(interval: number, rng: Rng): number {
  if (interval === 0) return 0;
  const factor = 0.9 + rng.next() * 0.2; // [0.9, 1.1)
  return Math.round(interval * factor);
}

export function isDue(record: SrsRecord, now: number): boolean {
  // A never-introduced player is not "due" (it's new material, handled by the
  // session builder). box 0 with an introducedAt means it was just introduced.
  if (record.introducedAt === null) return false;
  return record.due <= now;
}

/** Mark a player introduced (first appearance in a lesson). Idempotent. */
export function introduce(record: SrsRecord, now: number): SrsRecord {
  if (record.introducedAt !== null) return record;
  return { ...record, introducedAt: now, box: Math.max(record.box, 1), due: now };
}

export interface GradeInput {
  record: SrsRecord;
  correct: boolean;
  now: number;
  rng: Rng;
  /** whether the graded question was a typed-name question (for legendary) */
  typed?: boolean;
  /** the id the user picked when wrong, to log a confusion pair */
  confusedWith?: string | null;
  /** true only for genuine due reviews; practice on not-due never advances box */
  isReview?: boolean;
}

/**
 * Grade an answer and return the updated record. Correct on a due review
 * advances the box; wrong drops it by 2 (min 1) and re-dues tomorrow.
 * Correct answers on not-yet-due players never advance the box (no grinding).
 */
export function grade(input: GradeInput): SrsRecord {
  const { record, correct, now, rng, typed, confusedWith, isReview } = input;
  const r: SrsRecord = {
    ...record,
    seen: record.seen + 1,
    correct: record.correct + (correct ? 1 : 0),
    lastWrongWith: [...record.lastWrongWith],
  };
  if (r.introducedAt === null) r.introducedAt = now;

  if (correct) {
    const advance = isReview !== false; // default: treat as review-eligible
    if (advance && r.box < MAX_BOX) r.box += 1;
    if (r.box < 1) r.box = 1;
    r.due = now + jitter(BOX_INTERVALS[r.box], rng);
    if (typed && r.box >= MAX_BOX) r.legendary = true;
  } else {
    r.box = Math.max(1, r.box - 2);
    r.due = now + jitter(BOX_INTERVALS[1], rng); // tomorrow-ish
    // Log which player they confused this one with (most-recent first, capped).
    // Caller passes a distractor id, never the target's own id.
    if (confusedWith) {
      const list = r.lastWrongWith.filter((id) => id !== confusedWith);
      list.unshift(confusedWith);
      r.lastWrongWith = list.slice(0, CONFUSION_CAP);
    }
  }
  return r;
}

/** Strength 0..5 for UI meters. Past-due players are shown "decayed" in UI, but
 *  the stored box is unchanged (decay is presentational). */
export function strength(record: SrsRecord): number {
  return record.box;
}

export { newSrsRecord };
