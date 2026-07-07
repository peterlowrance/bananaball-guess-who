// Question generator — builds a single valid Question of a chosen type for a
// target player. Pure: (params, rng) -> Question. Guarantees an answerable
// question (correct option present, distinct choices).

import type { Player } from '../../data/types';
import { getTeam } from '../../data/dataset';
import type { Rng } from '../rng';
import { pickDistractors, pickJerseyDistractors } from './distractors';
import type { Choice, Question, QuestionType } from './types';

export interface GenParams {
  target: Player;
  box: number;
  roster: readonly Player[];
  confusedWith?: readonly string[];
  isReview: boolean;
  qid: string;
  /** force a specific question type; otherwise a random eligible type is used */
  forceType?: QuestionType;
}

/** Which question types are eligible given the target's box (plan §3.3). */
export function eligibleTypes(box: number): QuestionType[] {
  const types: QuestionType[] = ['photo-to-name', 'name-to-photo', 'which-team'];
  if (box >= 2) types.push('build-name');
  if (box >= 3) types.push('jersey', 'position');
  if (box >= 4) types.push('type-name');
  return types;
}

function nameChoices(target: Player, distractors: Player[], rng: Rng): { choices: Choice[]; correctIndex: number } {
  const all = rng.shuffle([target, ...distractors]);
  const choices = all.map((p) => ({ playerId: p.player_id, label: p.name }));
  return { choices, correctIndex: all.findIndex((p) => p.player_id === target.player_id) };
}

export function generateQuestion(params: GenParams, rng: Rng): Question {
  const { target, box, roster, confusedWith, isReview, qid } = params;
  const type = params.forceType ?? rng.pick(eligibleTypes(box));
  const distractors = pickDistractors({ target, box, roster, confusedWith }, rng);

  switch (type) {
    case 'photo-to-name':
    case 'name-to-photo': {
      const { choices, correctIndex } = nameChoices(target, distractors, rng);
      return { id: qid, type, targetId: target.player_id, choices, correctIndex, isReview };
    }
    case 'which-team': {
      // choices are distinct teams; correct = target's team. Distractor players
      // may share the target's team, so gather distinct *other* teams directly
      // from the full roster to guarantee up to 4 options.
      const teamIds = new Set<string>([target.team_id]);
      const otherTeams = rng.shuffle(
        [...new Set(roster.map((p) => p.team_id))].filter((tid) => tid !== target.team_id),
      );
      for (const tid of otherTeams) {
        if (teamIds.size >= 4) break;
        teamIds.add(tid);
      }
      const ordered = rng.shuffle([...teamIds]);
      const choices: Choice[] = ordered.map((tid) => ({
        playerId: tid, // team id in the playerId slot for this type
        label: getTeam(tid).name,
      }));
      return {
        id: qid,
        type,
        targetId: target.player_id,
        choices,
        correctIndex: ordered.indexOf(target.team_id),
        isReview,
      };
    }
    case 'jersey': {
      const nums = pickJerseyDistractors(target, roster, rng);
      const all = rng.shuffle([target.jersey_number, ...nums]);
      const choices: Choice[] = all.map((n) => ({ playerId: target.player_id, label: String(n) }));
      return {
        id: qid,
        type,
        targetId: target.player_id,
        choices,
        correctIndex: all.indexOf(target.jersey_number),
        isReview,
      };
    }
    case 'position': {
      // "Which of these is a <position family>?" target matches, distractors don't
      const { choices, correctIndex } = nameChoices(target, distractors, rng);
      return {
        id: qid,
        type,
        targetId: target.player_id,
        choices,
        correctIndex,
        answerText: target.position_label,
        isReview,
      };
    }
    case 'build-name': {
      const parts = target.name.split(' ');
      const decoyPool = distractors.flatMap((d) => d.name.split(' '));
      const decoys = rng.sample([...new Set(decoyPool)].filter((t) => !parts.includes(t)), 4);
      const tiles = rng.shuffle([...parts, ...decoys]);
      return {
        id: qid,
        type,
        targetId: target.player_id,
        choices: [],
        correctIndex: -1,
        tiles,
        answerText: target.name,
        isReview,
      };
    }
    case 'type-name': {
      return {
        id: qid,
        type,
        targetId: target.player_id,
        choices: [],
        correctIndex: -1,
        answerText: target.name,
        isReview,
      };
    }
  }
}

/** Generate a question of a specific type (used by the session builder). */
export function generateOfType(
  params: GenParams,
  type: QuestionType,
  rng: Rng,
): Question {
  return generateQuestion({ ...params, forceType: type }, rng);
}
