// Builds a lesson session for a unit from store state + the engine, and exposes
// grading + progression callbacks the lesson UI drives. Session content is
// transient (not persisted); SRS/XP effects go through the store.

import { useMemo, useRef, useState, useCallback } from 'react';
import { useStore } from '../../store';
import { players, getPlayer } from '../../data/dataset';
import { buildSession, type PlayerState } from '../../engine/quiz/session';
import type { SessionQuestion } from '../../engine/quiz/types';
import { mulberry32, hashSeed } from '../../engine/rng';
import { isDue } from '../../engine/srs/scheduler';
import { newSrsRecord } from '../../engine/srs/types';
import { brokenImageIds } from '../shared/PlayerImage';

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
    const dueReviews = pool
      .filter((p) => isDue(srsFor(p.player_id), now))
      .sort((a, b) => srsFor(a.player_id).due - srsFor(b.player_id).due)
      .map((p) => stateFor(p.player_id));

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

  return useLessonRunner(questions, config.unitPlayerIds);
}

export interface AnswerRecord {
  question: SessionQuestion;
  correct: boolean;
  firstTry: boolean;
}

function useLessonRunner(initialQuestions: SessionQuestion[], unitPlayerIds: string[]) {
  // A mutable queue: wrong answers re-queue the player (capped) as in Duolingo.
  const [queue, setQueue] = useState<SessionQuestion[]>(initialQuestions);
  const [index, setIndex] = useState(0);
  const answers = useRef<AnswerRecord[]>([]);
  const requeueCount = useRef<Map<string, number>>(new Map());
  const combo = useRef(0);
  const bestCombo = useRef(0);
  const firstTryIds = useRef<Set<string>>(new Set());
  const missedIds = useRef<Set<string>>(new Set());

  const gradeAnswer = useStore((s) => s.gradeAnswer);
  const introducePlayer = useStore((s) => s.introducePlayer);

  const current = queue[index] ?? null;
  const total = initialQuestions.length;
  const done = index >= queue.length;

  const submit = useCallback(
    (correct: boolean, confusedWith?: string | null) => {
      const q = queue[index];
      if (!q) return;
      const firstTry = !missedIds.current.has(q.targetId + q.id);

      // ensure the player is introduced when first seen
      if (q.intro) introducePlayer(q.targetId);

      gradeAnswer({
        playerId: q.targetId,
        correct,
        typed: q.type === 'type-name',
        confusedWith: correct ? null : confusedWith ?? null,
        isReview: q.isReview,
        jerseyQuestion: q.type === 'jersey',
      });

      answers.current.push({ question: q, correct, firstTry });

      if (correct) {
        combo.current += 1;
        bestCombo.current = Math.max(bestCombo.current, combo.current);
        if (firstTry) firstTryIds.current.add(q.id);
      } else {
        combo.current = 0;
        missedIds.current.add(q.targetId + q.id);
        // re-queue up to twice, then let it go (no rage loop)
        const n = requeueCount.current.get(q.id) ?? 0;
        if (n < 2) {
          requeueCount.current.set(q.id, n + 1);
          setQueue((prev) => {
            const copy = [...prev];
            // insert 2 slots ahead (or at end)
            const at = Math.min(index + 3, copy.length);
            copy.splice(at, 0, { ...q });
            return copy;
          });
        }
      }
      setIndex((i) => i + 1);
    },
    [queue, index, gradeAnswer, introducePlayer],
  );

  const summary = useCallback(() => {
    const correctCount = answers.current.filter((a) => a.correct).length;
    const firstTryCorrect = firstTryIds.current.size;
    return {
      total,
      correctCount,
      firstTryCorrect,
      bestCombo: bestCombo.current,
      unitPlayerIds,
    };
  }, [total, unitPlayerIds]);

  return {
    current,
    index,
    total,
    queueLength: queue.length,
    combo: combo.current,
    done,
    submit,
    summary,
  };
}
