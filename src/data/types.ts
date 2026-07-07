// Shapes for the bundled dataset (data/players-2026.json). Kept in sync with
// data/build-clean.mjs. Guarded at runtime by dataset.test.ts.

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Confidence = 'high' | 'medium' | 'low' | 'unmatched';

export interface HittingStats {
  g: number;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  hr: number;
  avg: string;
  ops: string;
}

export interface PitchingStats {
  g: number | null;
  w: number | null;
  l: number | null;
  sv: number | null;
  ip: string | null;
  so: number | null;
  era: string | null;
}

export interface Team {
  team_id: string;
  name: string;
  abbreviation: string;
  slug: string;
  logo_url: string;
}

export interface Player {
  player_id: string;
  slug: string;
  name: string;
  team_id: string;
  team_name: string;
  jersey_number: number;
  position_label: string;
  image_url: string;
  hitting: HittingStats | null;
  pitching: PitchingStats | null;
  difficulty: Difficulty;
  popularity_rank: number | null;
  popularity_confidence: Confidence;
}

export interface Dataset {
  source: string;
  season: string;
  season_id: string;
  generated_from: string;
  team_count: number;
  player_count: number;
  teams: Team[];
  players: Player[];
}
