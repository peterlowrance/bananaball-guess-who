// Session builder — composes a full lesson/quiz from new players + due reviews.
// Pure: (spec, rng) -> SessionQuestion[]. See plan §3.2, §3.9.

import type { Player } from '../../data/types';
import type { Rng } from '../rng';
import { generateOfType, eligibleTypes } from './generator';
import type { QuestionType, SessionQuestion } from './types';

export interface PlayerState {
  player: Player;
  box: number;
  confusedWith: readonly string[];
  introduced: boolean;
}

export interface SessionSpec {
  /** candidate new players to introduce, in intended order */
  newPlayers: PlayerState[];
  /** due reviews, most-overdue first */
  dueReviews: PlayerState[];
  /** the full player pool available as distractors */
  roster: readonly Player[];
  /** player_ids whose image is known to have failed — avoid photo questions */
  brokenImageIds?: ReadonlySet<string>;
  /** total question slots (default 12) */
  length?: number;
  /** max new players to introduce (default 3) */
  maxNew?: number;
}

const PHOTO_TYPES: ReadonlySet<QuestionType> = new Set([
  'photo-to-name',
  'name-to-photo',
  'build-name',
  'type-name',
  'jersey',
  'position',
]);
// Only 'which-team' is fully photo-free among choice types; name-to-photo shows
// distractor photos too. For a broken *target* image, prefer name-based recall.
const NON_TARGET_PHOTO_TYPES: ReadonlySet<QuestionType> = new Set(['which-team']);

/** Choose a question type for a target, avoiding photo types if its image is broken. */
function chooseType(state: PlayerState, broken: boolean, rng: Rng): QuestionType {
  let types = eligibleTypes(state.box);
  if (broken) {
    const safe = types.filter((t) => NON_TARGET_PHOTO_TYPES.has(t) || !PHOTO_TYPES.has(t));
    types = safe.length ? safe : ['which-team'];
  }
  return rng.pick(types);
}

export function buildSession(spec: SessionSpec, rng: Rng): SessionQuestion[] {
  const length = spec.length ?? 12;
  const broken = spec.brokenImageIds ?? new Set<string>();
  const maxNew = Math.min(spec.maxNew ?? 3, spec.newPlayers.length);

  // Scale down new material when the review queue is heavy (plan §3.2).
  let newCount = maxNew;
  if (spec.dueReviews.length >= 30) newCount = 0;
  else if (spec.dueReviews.length >= 15) newCount = Math.min(2, maxNew);

  const chosenNew = spec.newPlayers.slice(0, newCount);
  const out: SessionQuestion[] = [];
  let qn = 0;
  const nextId = () => `q${qn++}`;

  const makeQ = (
    state: PlayerState,
    type: QuestionType,
    intro: boolean,
    isReview: boolean,
  ): SessionQuestion => ({
    ...generateOfType(
      {
        target: state.player,
        box: state.box,
        roster: spec.roster,
        confusedWith: state.confusedWith,
        isReview,
        qid: nextId(),
      },
      type,
      rng,
    ),
    intro,
  });

  // 1. Introduce new players: intro card + 2 easy questions each.
  for (const state of chosenNew) {
    const isBroken = broken.has(state.player.player_id);
    out.push(makeQ(state, isBroken ? 'which-team' : 'photo-to-name', true, false));
    out.push(makeQ(state, isBroken ? 'which-team' : 'name-to-photo', false, false));
  }

  // 2. Fill remaining slots. Reviews come first (advance boxes), then recycle
  //    just-introduced players if reviews run out. We cycle a fixed candidate
  //    list; a hard iteration cap guarantees termination.
  const fill: { state: PlayerState; isReview: boolean }[] = [
    ...spec.dueReviews.map((state) => ({ state, isReview: true })),
    ...chosenNew.map((state) => ({ state, isReview: false })),
  ];
  const distinctTargets = new Set(fill.map((f) => f.state.player.player_id)).size;

  if (fill.length > 0) {
    let idx = 0;
    let guard = 0;
    const maxIters = length * 4 + 8;
    while (out.length < length && guard++ < maxIters) {
      const { state, isReview } = fill[idx % fill.length];
      idx++;
      // avoid two consecutive questions on the same target when we can
      const prev = out[out.length - 1];
      if (prev && prev.targetId === state.player.player_id && distinctTargets > 1) {
        continue;
      }
      const isBroken = broken.has(state.player.player_id);
      out.push(makeQ(state, chooseType(state, isBroken, rng), false, isReview));
    }
  }

  return out.slice(0, length);
}
