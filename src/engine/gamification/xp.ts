// XP economy (plan §3.6). Pure functions computing XP awards.

export const XP = {
  correct: 2,
  lessonBase: 10,
  perfectBonus: 10,
  comboUnit: 3, // per streak-of-5 within a lesson
  unitQuiz: 50,
  checkpoint: 100,
  legendary: 40,
  practice: 15,
  firstOfDay: 5,
} as const;

export interface LessonResult {
  correctCount: number;
  total: number;
  /** number of questions answered correctly on the FIRST try */
  firstTryCorrect: number;
  /** longest run of consecutive correct answers */
  bestCombo: number;
}

/** XP for finishing a standard lesson. */
export function lessonXp(r: LessonResult): number {
  let xp = XP.lessonBase + r.correctCount * XP.correct;
  const perfect = r.firstTryCorrect === r.total && r.total > 0;
  if (perfect) xp += XP.perfectBonus;
  xp += Math.floor(r.bestCombo / 5) * XP.comboUnit;
  return xp;
}

export type LevelTitle = {
  title: string;
  min: number;
};

// XP level titles (plan §3.11).
export const LEVELS: readonly LevelTitle[] = [
  { title: 'Rookie', min: 0 },
  { title: 'Bench Warmer', min: 250 },
  { title: 'First-Base Coach', min: 750 },
  { title: 'Fan Favorite', min: 2000 },
  { title: 'Showman', min: 4500 },
  { title: 'Banana Legend', min: 9000 },
];

export function levelForXp(totalXp: number): { level: number; title: string; next: LevelTitle | null } {
  let level = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXp >= LEVELS[i].min) level = i;
  }
  return {
    level,
    title: LEVELS[level].title,
    next: LEVELS[level + 1] ?? null,
  };
}
