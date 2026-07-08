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
  gs: number | null;
  w: number | null;
  l: number | null;
  sv: number | null;
  ip: string | null;
  so: number | null; // strikeouts (source field: k)
  era: string | null;
  runs_allowed: number | null;
  hits_allowed: number | null;
}

/** Career (all-seasons) totals for the Banana-Ball-only stats the season slice
 *  doesn't expose. NOT season-scoped — these are lifetime totals. */
export interface CareerStats {
  g: number | null; // career games
  b4s: number | null; // ball-four sprints (took off instead of walking)
  sb: number | null; // stolen bases
  wo: number | null; // walk-offs
}

export interface FieldingStats {
  g: number | null;
  e: number | null; // errors
  air_outs: number | null;
  ground_outs: number | null;
  tpo: number | null; // trick play outs
  tpm: number | null; // trick plays missed
  trick_play_rate: string | null; // e.g. "3.7%"
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
  /** Primary image (first entry of `images`), or null if the player has no real
   *  photo from any source. Kept for backward compatibility. */
  image_url: string | null;
  /** All verified official photos for this player, most-canonical first:
   *  the neutral stats headshot, then any official media-day photo. Filtered so
   *  every entry is a real image (HTML-placeholder URLs are removed at build
   *  time). May be empty — the UI falls back to a team-colored initials avatar. */
  images: string[];
  hitting: HittingStats | null;
  pitching: PitchingStats | null;
  fielding: FieldingStats | null;
  /** Career (all-seasons) B4S/SB/WO totals — not season-scoped. */
  career: CareerStats | null;
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
