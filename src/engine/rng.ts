// Seeded, deterministic RNG. Every session/quiz is generated from a seed so it
// is reproducible in tests and stable across a resume. Never use Math.random()
// in the engine.

export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** integer in [0, max) */
  int(max: number): number;
  /** pick one element (throws on empty) */
  pick<T>(arr: readonly T[]): T;
  /** Fisher–Yates shuffle into a new array */
  shuffle<T>(arr: readonly T[]): T[];
  /** take up to n distinct random elements */
  sample<T>(arr: readonly T[], n: number): T[];
}

/** mulberry32 — tiny, fast, good enough for game content generation. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (max: number) => Math.floor(next() * max);
  const pick = <T>(arr: readonly T[]): T => {
    if (arr.length === 0) throw new Error('pick from empty array');
    return arr[int(arr.length)];
  };
  const shuffle = <T>(arr: readonly T[]): T[] => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const sample = <T>(arr: readonly T[], n: number): T[] =>
    shuffle(arr).slice(0, Math.max(0, Math.min(n, arr.length)));
  return { next, int, pick, shuffle, sample };
}

/** FNV-1a 32-bit hash of a string → a seed. Deterministic. */
export function hashSeed(...parts: (string | number)[]): number {
  const str = parts.join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
