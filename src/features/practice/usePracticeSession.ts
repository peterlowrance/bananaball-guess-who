// Builds a review/weak/team practice session (review-only, no new intros) from
// the store, reusing the engine session builder. Mirrors useLessonSession but
// selects the player pool by practice mode.

import { useMemo } from 'react';
import { useStore } from '../../store';
import { players, getPlayer } from '../../data/dataset';
import { buildSession, type PlayerState } from '../../engine/quiz/session';
import { mulberry32, hashSeed } from '../../engine/rng';
import { isDue } from '../../engine/srs/scheduler';
import { newSrsRecord } from '../../engine/srs/types';
import { brokenImageIds } from '../shared/PlayerImage';

export type PracticeMode = 'review' | 'weak' | 'teams';

export interface PracticeConfig {
  mode: PracticeMode;
  teams?: string[]; // for team drills
  any?: boolean; // review mode: include not-yet-due introduced players
  length?: number;
}

const PRACTICE_LENGTH = 10;

export function buildPracticeQuestions(config: PracticeConfig, srs: Record<string, ReturnType<typeof newSrsRecord>>) {
  const now = Date.now();
  const rec = (id: string) => srs[id] ?? newSrsRecord();
  const introduced = (id: string) => rec(id).introducedAt != null;
  const stateFor = (id: string): PlayerState => {
    const r = rec(id);
    return { player: getPlayer(id), box: r.box, confusedWith: r.lastWrongWith, introduced: true };
  };

  let pool: string[] = [];
  if (config.mode === 'review') {
    pool = players
      .filter((p) => introduced(p.player_id))
      .filter((p) => config.any || isDue(rec(p.player_id), now))
      .sort((a, b) => rec(a.player_id).due - rec(b.player_id).due)
      .map((p) => p.player_id);
  } else if (config.mode === 'teams') {
    const set = new Set(config.teams ?? []);
    pool = players
      .filter((p) => set.has(p.team_name) && introduced(p.player_id))
      .map((p) => p.player_id);
  } else {
    // weak: introduced players with the lowest accuracy (min seen 1)
    pool = players
      .filter((p) => introduced(p.player_id) && rec(p.player_id).seen > 0)
      .sort((a, b) => accuracy(rec(a.player_id)) - accuracy(rec(b.player_id)))
      .map((p) => p.player_id);
  }

  const length = config.length ?? PRACTICE_LENGTH;
  const dueReviews = pool.slice(0, Math.max(length, 12)).map(stateFor);
  const seed = hashSeed('practice', config.mode, (config.teams ?? []).join(','), pool.length);
  return buildSession(
    {
      newPlayers: [],
      dueReviews,
      roster: players,
      brokenImageIds: brokenImageIds(),
      length,
    },
    mulberry32(seed),
  );
}

function accuracy(r: ReturnType<typeof newSrsRecord>): number {
  return r.seen === 0 ? 1 : r.correct / r.seen;
}

/** Returns the built questions + whether the pool was empty. */
export function usePracticeQuestions(config: PracticeConfig) {
  const srs = useStore((s) => s.players);
  return useMemo(
    () => buildPracticeQuestions(config, srs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.mode, (config.teams ?? []).join(','), config.any, config.length],
  );
}
