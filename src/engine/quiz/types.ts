// Question and session shapes produced by the generator. Pure data.

export type QuestionType =
  | 'photo-to-name' // show headshot, pick full name (4 choices)
  | 'name-to-photo' // show name, pick photo (4 photos)
  | 'first-name' // show headshot, pick FIRST name (4 choices)
  | 'last-name' // show headshot, pick LAST name (4 choices)
  | 'build-name' // show headshot, assemble full name from word tiles
  | 'build-first' // show headshot, spell FIRST name from letter tiles
  | 'build-last' // show headshot, spell LAST name from letter tiles
  | 'type-name' // show headshot, type the name
  | 'which-team' // show headshot+name, pick team logo
  | 'jersey' // show headshot, pick jersey number
  | 'position'; // pick the player matching a position among 4

export interface Choice {
  playerId: string; // the player this choice refers to (or represents)
  /** display label depends on question type (name, number, team name) */
  label: string;
}

export interface Question {
  id: string; // stable within a session
  type: QuestionType;
  targetId: string; // the player being tested
  /** MC options (for choice-based types). Correct one has playerId===targetId
   *  for identity types; for which-team/jersey the correct label is derived. */
  choices: Choice[];
  correctIndex: number; // index into choices (choice types); -1 for type-name
  /** for build-name: the tiles to assemble (correct name-parts + decoys) */
  tiles?: string[];
  /** the correct assembled answer / typed answer target text */
  answerText?: string;
  isReview: boolean; // graded as a review (advances box) vs new/practice
}

export interface SessionQuestion extends Question {
  /** whether this slot introduces the target for the first time (intro card) */
  intro: boolean;
}
