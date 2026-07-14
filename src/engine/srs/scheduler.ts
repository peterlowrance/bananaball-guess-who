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

// Advancement caps (invisible to the user). A session can move a player up at
// most one box (the caller enforces that via `allowAdvance`); on top of that,
// a player's box can rise at most MAX_BOX_UPS_PER_DAY times per rolling day —
// so grinding sessions back-to-back can't march a player to "mastered" without
// at least a night in between. Due-ness does NOT gate advancement.
const MAX_BOX_UPS_PER_DAY = 3;
const BOX_UP_WINDOW = DAY;

/** Box-up timestamps still inside the rolling window. Tolerates records
 *  persisted before `boxUps` existed. */
function recentBoxUps(record: SrsRecord, now: number): number[] {
  return (record.boxUps ?? []).filter((t) => now - t < BOX_UP_WINDOW);
}

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

/** Mark a player introduced (first appearance in a lesson). Idempotent. The
 *  0→1 move counts as a box-up toward the daily cap — it IS an advancement. */
export function introduce(record: SrsRecord, now: number): SrsRecord {
  if (record.introducedAt !== null) return record;
  return {
    ...record,
    introducedAt: now,
    box: Math.max(record.box, 1),
    due: now,
    boxUps: [...recentBoxUps(record, now), now],
  };
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
  /** false when this player already moved up a box this session — the caller
   *  (question runner) enforces the +1-per-session cap. Default true. */
  allowAdvance?: boolean;
  /** practice sessions soften a wrong answer to a 1-box drop (lessons: 2) */
  practice?: boolean;
}

/**
 * Grade an answer and return the updated record. A correct answer advances the
 * box (due or not), capped at once per session (`allowAdvance`, caller-owned)
 * and MAX_BOX_UPS_PER_DAY per rolling day. A wrong answer drops the box by 2
 * (1 in practice), min 1, and re-dues tomorrow.
 */
export function grade(input: GradeInput): SrsRecord {
  const { record, correct, now, rng, typed, confusedWith, allowAdvance, practice } = input;
  const r: SrsRecord = {
    ...record,
    seen: record.seen + 1,
    correct: record.correct + (correct ? 1 : 0),
    lastWrongWith: [...record.lastWrongWith],
  };
  if (r.introducedAt === null) r.introducedAt = now;

  if (correct) {
    const ups = recentBoxUps(record, now);
    if (allowAdvance !== false && r.box < MAX_BOX && ups.length < MAX_BOX_UPS_PER_DAY) {
      r.box += 1;
      ups.push(now);
    }
    r.boxUps = ups;
    if (r.box < 1) r.box = 1;
    r.due = now + jitter(BOX_INTERVALS[r.box], rng);
    if (typed && r.box >= MAX_BOX) r.legendary = true;
  } else {
    r.box = Math.max(1, r.box - (practice ? 1 : 2));
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
