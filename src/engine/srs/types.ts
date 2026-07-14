// Spaced-repetition state per player. Stored in the persisted store, keyed by
// player_id. All fields are plain JSON.

export interface SrsRecord {
  box: number; // 0 = new/unseen-in-lesson, 1..5 (5 = mastered)
  due: number; // epoch ms when next review is due
  seen: number; // total questions asked about this player
  correct: number; // total correct answers
  lastWrongWith: string[]; // player_ids this player was confused with (capped)
  legendary: boolean; // reached box 5 AND passed a typed-name question
  introducedAt: number | null; // epoch ms first introduced, null if never
  /** epoch ms of recent box advancements (incl. the 0→1 introduce), pruned to
   *  the last rolling day — enforces the max-box-ups-per-day cap. Internal
   *  bookkeeping, never shown to the user. */
  boxUps: number[];
}

export function newSrsRecord(): SrsRecord {
  return {
    box: 0,
    due: 0,
    seen: 0,
    correct: 0,
    lastWrongWith: [],
    legendary: false,
    introducedAt: null,
    boxUps: [],
  };
}
