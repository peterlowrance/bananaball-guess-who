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
  };
}
