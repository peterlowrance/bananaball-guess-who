// Fuzzy answer checking for typed-name questions. Pure.
//
// Rules (plan §3.3 Q4):
//  - case- and diacritic-insensitive
//  - accept small typos (Damerau–Levenshtein distance <= threshold, scaled)
//  - accept last-name-only
//  - REJECT if the input matches a *different* roster player more closely than
//    the target (so "smith" isn't accepted when there are two Smiths and the
//    other is the closer match)

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[.'`\-]/g, '') // punctuation in names (Jr., O'Brien, hyphens)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Optimal string alignment (Damerau–Levenshtein with adjacent transpositions). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/** Allowed typos scale with name length: short names get 1, longer get 2. */
function threshold(target: string): number {
  return target.length <= 4 ? 1 : 2;
}

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv']);

/** normalized name with any trailing generational suffix dropped */
function withoutSuffix(fullName: string): string {
  const parts = normalize(fullName).split(' ');
  while (parts.length > 1 && SUFFIXES.has(parts[parts.length - 1])) parts.pop();
  return parts.join(' ');
}

function lastName(fullName: string): string {
  const parts = withoutSuffix(fullName).split(' ');
  return parts[parts.length - 1] ?? '';
}

/**
 * Distance of `input` to a single player's name — best of full name, full name
 * without suffix (so "Jackie Bradley" matches "Jackie Bradley Jr."), and last
 * name alone.
 */
export function distanceToName(input: string, fullName: string): number {
  const nInput = normalize(input);
  return Math.min(
    editDistance(nInput, normalize(fullName)),
    editDistance(nInput, withoutSuffix(fullName)),
    editDistance(nInput, lastName(fullName)),
  );
}

export interface CheckResult {
  correct: boolean;
  /** the player whose name best matched the input, if any was close */
  closestId: string | null;
}

export interface NamedPlayer {
  player_id: string;
  name: string;
}

/**
 * Check a typed answer against the target, disambiguating against the whole
 * roster so an ambiguous input that better matches another player is rejected.
 */
export function checkTypedAnswer(
  input: string,
  targetId: string,
  roster: readonly NamedPlayer[],
): CheckResult {
  const target = roster.find((p) => p.player_id === targetId);
  if (!target) return { correct: false, closestId: null };

  const targetDist = distanceToName(input, target.name);
  const limit = threshold(normalize(target.name));

  // find the globally closest player (ties broken toward the target)
  let bestId = target.player_id;
  let bestDist = targetDist;
  for (const p of roster) {
    if (p.player_id === targetId) continue;
    const d = distanceToName(input, p.name);
    if (d < bestDist) {
      bestDist = d;
      bestId = p.player_id;
    }
  }

  const correct = targetDist <= limit && bestId === targetId;
  return {
    correct,
    closestId: bestDist <= 3 ? bestId : null,
  };
}
