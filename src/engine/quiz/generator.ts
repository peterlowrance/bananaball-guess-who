// Question generator — builds a single valid Question of a chosen type for a
// target player. Pure: (params, rng) -> Question. Guarantees an answerable
// question (correct option present, distinct choices).

import type { Player } from '../../data/types';
import { getTeam } from '../../data/dataset';
import type { Rng } from '../rng';
import { pickDistractors, pickJerseyDistractors } from './distractors';
import { firstName, lastName, dropSuffix } from './name-parts';
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

/** Which question types are eligible given the target's box (plan §3.3).
 *  Difficulty ramps implicitly: first/last-name recognition is the easiest rung,
 *  then full-name recognition + which-team, then spelling single names, then
 *  facts (jersey/position) and full-name build, then free typing. */
export function eligibleTypes(box: number): QuestionType[] {
  const types: QuestionType[] = ['first-name', 'last-name', 'photo-to-name', 'name-to-photo', 'which-team'];
  if (box >= 2) types.push('build-first', 'build-last', 'build-name');
  if (box >= 3) types.push('jersey', 'position');
  if (box >= 4) types.push('type-name');
  return types;
}

function nameChoices(target: Player, distractors: Player[], rng: Rng): { choices: Choice[]; correctIndex: number } {
  const all = rng.shuffle([target, ...distractors]);
  const choices = all.map((p) => ({ playerId: p.player_id, label: p.name }));
  return { choices, correctIndex: all.findIndex((p) => p.player_id === target.player_id) };
}

/**
 * Choices labeled with just the first OR last name. Guards against ambiguity:
 * a distractor sharing the target's part-name would create two right answers,
 * so we only keep distractors whose part-name differs from the target's (and
 * from each other). If too few survive, we backfill from the full roster.
 */
function partialNameChoices(
  target: Player,
  distractors: Player[],
  roster: readonly Player[],
  part: (name: string) => string,
  rng: Rng,
): { choices: Choice[]; correctIndex: number } {
  const targetLabel = part(target.name).toLowerCase();
  const used = new Set<string>([targetLabel]);
  const kept: Player[] = [];
  const consider = (p: Player) => {
    if (kept.length >= 3) return;
    const label = part(p.name).toLowerCase();
    if (used.has(label)) return; // collides with target or an already-kept choice
    used.add(label);
    kept.push(p);
  };
  distractors.forEach(consider);
  if (kept.length < 3) rng.shuffle([...roster]).forEach(consider);

  const all = rng.shuffle([target, ...kept]);
  const choices = all.map((p) => ({ playerId: p.player_id, label: part(p.name) }));
  return { choices, correctIndex: all.findIndex((p) => p.player_id === target.player_id) };
}

/** Split an alpha-only, uppercased name into ordered chunks of 2-3 letters.
 *  Chunking keeps each tile's internal order intact, so the player only has to
 *  sequence a handful of syllable-ish pieces instead of every single letter —
 *  a much easier rung than full letter-scramble. Chunk sizes are chosen so no
 *  chunk is a lone trailing letter (we grow the previous chunk to 3 instead).
 *  Deterministic given `rng`. */
function chunkName(letters: string[], rng: Rng): string[] {
  if (letters.length <= 3) return [letters.join('')];
  const chunks: string[] = [];
  let i = 0;
  while (i < letters.length) {
    const remaining = letters.length - i;
    // Never leave a size-1 tail: with 4 left, take 2 (→2,2); otherwise pick 2-3.
    let size = remaining <= 3 ? remaining : remaining === 4 ? 2 : 2 + rng.int(2);
    if (remaining - size === 1) size = remaining; // avoid a lone final letter
    chunks.push(letters.slice(i, i + size).join(''));
    i += size;
  }
  return chunks;
}

/** Tiles for spelling a single name. Difficulty scales the tile granularity:
 *   - 'chunks'  : ordered 2-3 letter pieces + a couple decoy chunks (easiest)
 *   - 'letters' : every letter as its own tile + decoy letters (hardest)
 *  All uppercased so decoys aren't distinguishable by case. Spaces/punctuation
 *  are not tiled (single names don't have them). */
function nameTiles(answer: string, mode: 'chunks' | 'letters', rng: Rng): string[] {
  const letters = answer.replace(/[^a-zA-Z]/g, '').toUpperCase().split('');
  if (mode === 'letters') {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((c) => !letters.includes(c));
    const decoyCount = Math.min(4, Math.max(2, Math.round(letters.length / 2)));
    return rng.shuffle([...letters, ...rng.sample(alphabet, decoyCount)]);
  }
  // chunk mode: the real chunks plus 1-2 decoy chunks that look plausible but
  // aren't one of the real pieces (so a decoy can't double as a correct tile).
  const chunks = chunkName(letters, rng);
  const decoyCount = chunks.length <= 2 ? 1 : 2;
  const real = new Set(chunks);
  const vowels = 'AEIOU';
  const cons = 'BCDFGHKLMNPRST';
  const decoys: string[] = [];
  let guard = 0;
  while (decoys.length < decoyCount && guard++ < 50) {
    const len = 2 + rng.int(2); // 2 or 3
    let d = '';
    for (let k = 0; k < len; k++) {
      const pool = k % 2 === 0 ? cons : vowels; // alternate → pronounceable-ish
      d += pool[rng.int(pool.length)];
    }
    if (!real.has(d) && !decoys.includes(d)) decoys.push(d);
  }
  return rng.shuffle([...chunks, ...decoys]);
}

export function generateQuestion(params: GenParams, rng: Rng): Question {
  const { target, box, roster, confusedWith, isReview, qid } = params;
  const type = params.forceType ?? rng.pick(eligibleTypes(box));
  // For name-to-photo the DISTRACTOR photos are shown, so an all-other-team set
  // is a giveaway — you'd just pick the one tile wearing the right jersey. Force
  // same-team distractors so the jersey can't be the tell and you must recognize
  // the face. (photo-to-name shows only the target's photo + name choices, so
  // jersey parity is irrelevant there.)
  const distractors = pickDistractors(
    { target, box, roster, confusedWith, sameTeam: type === 'name-to-photo' },
    rng,
  );

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
    case 'first-name':
    case 'last-name': {
      const part = type === 'first-name' ? firstName : lastName;
      const { choices, correctIndex } = partialNameChoices(target, distractors, roster, part, rng);
      return {
        id: qid,
        type,
        targetId: target.player_id,
        choices,
        correctIndex,
        answerText: part(target.name),
        isReview,
      };
    }
    case 'build-name': {
      // Drop the generational suffix so "Jr." never appears as a giveaway tile.
      const answer = dropSuffix(target.name);
      const parts = answer.split(' ');
      const decoyPool = distractors.flatMap((d) => dropSuffix(d.name).split(' '));
      const decoys = rng.sample([...new Set(decoyPool)].filter((t) => !parts.includes(t)), 4);
      const tiles = rng.shuffle([...parts, ...decoys]);
      return {
        id: qid,
        type,
        targetId: target.player_id,
        choices: [],
        correctIndex: -1,
        tiles,
        answerText: answer,
        isReview,
      };
    }
    case 'build-first':
    case 'build-last': {
      const answer = (type === 'build-first' ? firstName : lastName)(target.name);
      // Difficulty ramps with the box: at the unlock rung (box 2) always use the
      // easier chunk tiles; from box 3 up, mostly single-letter tiles but still
      // occasionally chunks for variety. Full letter-scramble is the hard mode.
      const mode: 'chunks' | 'letters' = box <= 2 || rng.next() < 0.35 ? 'chunks' : 'letters';
      return {
        id: qid,
        type,
        targetId: target.player_id,
        choices: [],
        correctIndex: -1,
        tiles: nameTiles(answer, mode, rng),
        answerText: answer,
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
