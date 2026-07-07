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
  /** unit player ids to (potentially) introduce/practice */
  unitPlayerIds: string[];
  /** attempt number for this node — varies the seed */
  attempt: number;
  /** review-only session (quiz/practice) introduces no new players */
  reviewOnly?: boolean;
  length?: number;
}

export function useLessonSession(config: LessonConfig) {
  const storeState = useStore();
  const focusTeams = storeState.profile.settings.focusTeams;

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
      };
    };

    // new players = unit members not yet introduced (in intended order)
    const newPlayers = config.reviewOnly
      ? []
      : config.unitPlayerIds.filter((id) => srsFor(id).introducedAt === null).map(stateFor);

    // due reviews across the (optionally focused) pool
    const pool = focusTeams.length
      ? players.filter((p) => focusTeams.includes(p.team_name))
      : players;
    const dueIds = new Set(
      pool.filter((p) => isDue(srsFor(p.player_id), now)).map((p) => p.player_id),
    );
    // A unit quiz is a checkpoint on the players you just learned: always test
    // the unit's introduced members, whether or not SRS says they're "due"
    // yet — otherwise a quiz taken right after the lessons has nothing due and
    // ends up empty (0/0). Merge those in, most-overdue first.
    const reviewIds = new Set(dueIds);
    if (config.reviewOnly) {
      for (const id of config.unitPlayerIds) {
        if (srsFor(id).introducedAt !== null) reviewIds.add(id);
      }
    }
    const dueReviews = [...reviewIds]
      .sort((a, b) => srsFor(a).due - srsFor(b).due)
      .map(stateFor);

    // roster available as distractors: whole roster (locked players allowed),
    // but narrow to focus teams if the user is focusing, so distractors feel
    // on-topic and single-team sessions stay coherent.
    const roster = focusTeams.length ? pool : players;

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
  }, [config.unitPlayerIds.join(','), config.attempt, config.reviewOnly, focusTeams.join(',')]);

  return useQuestionRunner(questions);
}
