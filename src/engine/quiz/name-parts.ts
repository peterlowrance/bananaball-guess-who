// Shared helpers for splitting a player's full name into first / last parts,
// dropping generational suffixes (Jr., Sr., II–IV). Used by the generator (to
// build first/last-name questions) and the answer checker (to accept
// suffix-less typed input). Pure string functions.

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv']);

/** true if a raw token (case-insensitive, punctuation-stripped) is a suffix */
function isSuffix(token: string): boolean {
  return SUFFIXES.has(token.toLowerCase().replace(/[.]/g, ''));
}

/** The full name with any trailing generational suffix token(s) removed. */
export function dropSuffix(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  while (parts.length > 1 && isSuffix(parts[parts.length - 1])) parts.pop();
  return parts.join(' ');
}

/** First given name (first token of the suffix-stripped name). */
export function firstName(fullName: string): string {
  return dropSuffix(fullName).split(/\s+/)[0] ?? '';
}

/** Last name (last token of the suffix-stripped name — excludes Jr./Sr. etc). */
export function lastName(fullName: string): string {
  const parts = dropSuffix(fullName).split(/\s+/);
  return parts[parts.length - 1] ?? '';
}
