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
  /** whether this player is genuinely due right now (vs folded in as review
   *  flavor: unit mix-ins, cameos, "any" practice). Drives the new-material
   *  throttle and the informational isReview flag; advancement itself is
   *  capped elsewhere (+1/session in the runner, daily cap in the scheduler).
   *  Defaults to true. */
  dueNow?: boolean;
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
  'first-name',
  'last-name',
  'build-name',
  'build-first',
  'build-last',
  'type-name',
  'jersey',
  'position',
]);
// Only 'which-team' is fully photo-free among choice types; name-to-photo shows
// distractor photos too. For a broken *target* image, prefer name-based recall.
const NON_TARGET_PHOTO_TYPES: ReadonlySet<QuestionType> = new Set(['which-team']);

/**
 * Choose a question type for a target.
 *  - Avoids photo types if the target's image is broken.
 *  - Scales down (or drops) 'which-team' when the section spans few teams:
 *    with one team it's a giveaway (only one possible answer in context), and
 *    with a couple of teams it's still too easy to be common. `sectionTeams` is
 *    the number of distinct teams among the players this session quizzes.
 */
function chooseType(
  state: PlayerState,
  broken: boolean,
  sectionTeams: number,
  rng: Rng,
): QuestionType {
  let types = eligibleTypes(state.box);
  if (broken) {
    // A broken target image: never show its photo. The ONLY non-target-photo
    // choice type is which-team, so it stays eligible here even in a single-team
    // section (a slightly-easy team question beats a broken image). We still fall
    // through to the down-weighting below when the section has enough teams.
    const safe = types.filter((t) => NON_TARGET_PHOTO_TYPES.has(t) || !PHOTO_TYPES.has(t));
    types = safe.length ? safe : ['which-team'];
    return rng.pick(types);
  }
  // Single-team section: 'which-team' has only one real answer — drop it.
  if (sectionTeams <= 1) {
    types = types.filter((t) => t !== 'which-team');
  } else if (sectionTeams <= 3 && types.includes('which-team')) {
    // Few teams: keep it possible but rare. Re-roll a which-team pick most of
    // the time so it shows up occasionally instead of at uniform frequency.
    const pick = rng.pick(types);
    if (pick === 'which-team' && rng.next() < 0.8) {
      return rng.pick(types.filter((t) => t !== 'which-team'));
    }
    return pick;
  }
  return rng.pick(types);
}

export function buildSession(spec: SessionSpec, rng: Rng): SessionQuestion[] {
  const length = spec.length ?? 12;
  const broken = spec.brokenImageIds ?? new Set<string>();
  const maxNew = Math.min(spec.maxNew ?? 3, spec.newPlayers.length);

  // Scale down new material when the review queue is heavy (plan §3.2). Only
  // genuinely-due reviews count — not-due mix-ins aren't backlog.
  const genuinelyDue = spec.dueReviews.filter((s) => s.dueNow ?? true).length;
  let newCount = maxNew;
  if (genuinelyDue >= 30) newCount = 0;
  else if (genuinelyDue >= 15) newCount = Math.min(2, maxNew);

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

  // How many distinct teams this session actually quizzes (NOT the distractor
  // roster, which is the whole dataset). Drives how often — if at all — we ask
  // "which team is this player on": pointless in a single-team section.
  const sectionTeams = new Set(
    [...spec.dueReviews, ...chosenNew].map((s) => s.player.team_id),
  ).size;

  // 1. Introduce new players: intro card + one easy recognition question each,
  //    then a second, *varied* follow-up per player — interleaved across the
  //    new players (A,B,C then A,B,C) instead of drilling one player twice in
  //    a row, so the pattern isn't the same rote intro/q/q every time. A
  //    broken-image player falls back to which-team (the only non-target-photo
  //    choice type), even in a single-team section — a broken photo is worse
  //    than an easy team question.
  const INTRO_TYPES: QuestionType[] = ['photo-to-name', 'name-to-photo'];
  const followupPool: QuestionType[] = [...INTRO_TYPES, 'first-name', 'last-name'];
  if (sectionTeams >= 4) followupPool.push('which-team');
  const introType = new Map<string, QuestionType>();
  for (const state of chosenNew) {
    const isBroken = broken.has(state.player.player_id);
    const t = isBroken ? 'which-team' : rng.pick(INTRO_TYPES);
    introType.set(state.player.player_id, t);
    out.push(makeQ(state, t, true, false));
  }
  for (const state of chosenNew) {
    const isBroken = broken.has(state.player.player_id);
    const first = introType.get(state.player.player_id);
    const t = isBroken
      ? 'which-team'
      : rng.pick(followupPool.filter((ft) => ft !== first));
    out.push(makeQ(state, t, false, false));
  }

  // 2. Fill remaining slots. Reviews come first (advance boxes), then recycle
  //    just-introduced players if reviews run out. We cycle a fixed candidate
  //    list; a hard iteration cap guarantees termination.
  const fill: { state: PlayerState; isReview: boolean }[] = [
    // isReview marks a genuine due review (informational — advancement is
    // capped by the runner/scheduler, not by this flag).
    ...spec.dueReviews.map((state) => ({ state, isReview: state.dueNow ?? true })),
    ...chosenNew.map((state) => ({ state, isReview: false })),
  ];
  const distinctTargets = new Set(fill.map((f) => f.state.player.player_id)).size;

  if (fill.length > 0) {
    // First pass keeps due-order priority (most-overdue first); subsequent
    // passes are re-shuffled so the session isn't a predictable round-robin.
    let order = fill;
    let pos = 0;
    let guard = 0;
    const maxIters = length * 4 + 8;
    while (out.length < length && guard++ < maxIters) {
      if (pos >= order.length) {
        order = rng.shuffle(fill);
        pos = 0;
      }
      const { state, isReview } = order[pos];
      pos++;
      // avoid two consecutive questions on the same target when we can
      const prev = out[out.length - 1];
      if (prev && prev.targetId === state.player.player_id && distinctTargets > 1) {
        continue;
      }
      const isBroken = broken.has(state.player.player_id);
      out.push(makeQ(state, chooseType(state, isBroken, sectionTeams, rng), false, isReview));
    }
  }

  return out.slice(0, length);
}
