// Builds a lesson session for a unit from store state + the engine, and exposes
// grading + progression callbacks the lesson UI drives. Session content is
// transient (not persisted); SRS/XP effects go through the store.

import { useMemo } from 'react';
import { useStore } from '../../store';
import { players, getPlayer } from '../../data/dataset';
import { buildSession, type PlayerState } from '../../engine/quiz/session';
import { mulberry32, hashSeed } from '../../engine/rng';
import { isDue } from '../../engine/srs/scheduler';
import { newSrsRecord } from '../../engine/srs/types';
import { brokenImageIds } from '../shared/PlayerImage';
import { useQuestionRunner } from './useQuestionRunner';

export interface LessonConfig {
  /** OWNED unit player ids — introduced/practiced/mastered here */
  unitPlayerIds: string[];
  /** CAMEO player ids — owned elsewhere, mixed in as review flavor only */
  cameoIds?: string[];
  /** attempt number for this node — varies the seed */
  attempt: number;
  /** review-only session (quiz/practice) introduces no new players */
  reviewOnly?: boolean;
  length?: number;
}

export function useLessonSession(config: LessonConfig) {
  const storeState = useStore();

  // Build the session once per (unit, attempt). Uses a seeded rng so it is
  // reproducible; a new attempt yields a fresh session.
  const questions = useMemo(() => {
    const now = Date.now();
    const srsFor = (id: string) => storeState.players[id] ?? newSrsRecord();

    const stateFor = (id: string): PlayerState => {
      const rec = srsFor(id);
      return {
        player: getPlayer(id),
        box: rec.box,
        confusedWith: rec.lastWrongWith,
        introduced: rec.introducedAt !== null,
        dueNow: isDue(rec, now),
      };
    };

    // new players = OWNED unit members not yet introduced (in intended order).
    // Cameo players are never introduced here — they're owned by an earlier
    // unit and appear only as review flavor.
    const newPlayers = config.reviewOnly
      ? []
      : config.unitPlayerIds.filter((id) => srsFor(id).introducedAt === null).map(stateFor);

    // due reviews across the whole roster
    const dueIds = new Set(
      players.filter((p) => isDue(srsFor(p.player_id), now)).map((p) => p.player_id),
    );
    // Fold in as review candidates (regardless of SRS due):
    //  - the unit's already-introduced OWNED members, ALWAYS — a lesson mixes
    //    new players with the ones you already learned in this section
    //    (Duolingo-style interleaving), a quiz is a checkpoint on the whole
    //    unit, and a replay of a completed unit has nothing due;
    //  - the unit's CAMEO players (owned elsewhere) as themed review flavor.
    // Mix-in reps can advance mastery, but grinding is bounded: the runner
    // caps advancement at +1 per player per session and the scheduler caps
    // box-ups per rolling day.
    const cameoIds = config.cameoIds ?? [];
    const reviewIds = new Set(dueIds);
    for (const id of config.unitPlayerIds) {
      if (srsFor(id).introducedAt !== null) reviewIds.add(id);
    }
    for (const id of cameoIds) {
      if (srsFor(id).introducedAt !== null) reviewIds.add(id);
    }
    const dueReviews = [...reviewIds]
      .sort((a, b) => srsFor(a).due - srsFor(b).due)
      .map(stateFor);

    // distractors: the whole roster (locked players allowed as plausible faces)
    const roster = players;

    const seed = hashSeed('lesson', config.unitPlayerIds.join(','), config.attempt);
    return buildSession(
      {
        newPlayers,
        dueReviews,
        roster,
        brokenImageIds: brokenImageIds(),
        length: config.length ?? 12,
      },
      mulberry32(seed),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.unitPlayerIds.join(','),
    (config.cameoIds ?? []).join(','),
    config.attempt,
    config.reviewOnly,
  ]);

  return useQuestionRunner(questions);
}
