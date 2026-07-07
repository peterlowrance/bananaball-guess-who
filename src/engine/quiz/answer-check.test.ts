import { describe, it, expect } from 'vitest';
import { normalize, editDistance, checkTypedAnswer } from './answer-check';

const roster = [
  { player_id: 'jbj', name: 'Jackie Bradley Jr.' },
  { player_id: 'jgz', name: 'Jose Gonzalez Jr.' },
  { player_id: 'jgt', name: 'Jose Gutierrez' },
  { player_id: 'moa', name: "Mo'ne Davis" },
  { player_id: 'kb', name: 'Kaden Bowler' },
];
const check = (input: string, id: string) => checkTypedAnswer(input, id, roster);

describe('normalize', () => {
  it('strips diacritics, case, punctuation', () => {
    expect(normalize('José Gutiérrez')).toBe('jose gutierrez');
    expect(normalize("Mo'ne  Davis")).toBe('mone davis');
    expect(normalize('Jackie Bradley Jr.')).toBe('jackie bradley jr');
  });
});

describe('editDistance', () => {
  it('handles transpositions as distance 1', () => {
    expect(editDistance('bowler', 'bolwer')).toBe(1);
  });
  it('is 0 for identical', () => {
    expect(editDistance('kaden', 'kaden')).toBe(0);
  });
});

describe('checkTypedAnswer', () => {
  it('accepts exact full name', () => {
    expect(check('Kaden Bowler', 'kb').correct).toBe(true);
  });
  it('accepts last-name only', () => {
    expect(check('bowler', 'kb').correct).toBe(true);
  });
  it('accepts full name with and without generational suffix', () => {
    expect(check('jackie bradley', 'jbj').correct).toBe(true);
    expect(check('jackie bradley jr', 'jbj').correct).toBe(true);
  });
  it('accepts small typos', () => {
    expect(check('bowlar', 'kb').correct).toBe(true); // 1 edit
    expect(check('bradly', 'jbj').correct).toBe(true);
  });
  it('accepts apostrophe/diacritic variants (full or last name)', () => {
    expect(check('mone davis', 'moa').correct).toBe(true);
    expect(check('davis', 'moa').correct).toBe(true); // last name
    // first-name-only is NOT a reliable identifier and is not accepted
    expect(check('mone', 'moa').correct).toBe(false);
  });
  it('rejects a name that better matches a different player', () => {
    // typing the other Jose's last name while target is Gonzalez
    expect(check('gutierrez', 'jgz').correct).toBe(false);
    // and it is accepted for the right one
    expect(check('gutierrez', 'jgt').correct).toBe(true);
  });
  it('rejects gibberish', () => {
    const r = check('zzzzzz', 'kb');
    expect(r.correct).toBe(false);
  });
  it('rejects unknown target id gracefully', () => {
    expect(checkTypedAnswer('anything', 'nope', roster).correct).toBe(false);
  });
});
