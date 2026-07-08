import { describe, it, expect } from 'vitest';
import { unitDefs, loadCurriculum } from './curriculum';
import { players, teams } from './dataset';
import { teamThemeSlug } from '../lib/theme';
import { MOTIF_ICON_NAMES } from '../lib/motif';

// The curriculum is now HAND-AUTHORED (units-2026.json). These invariants are
// the safety net for authoring: a typo'd id, a player owned twice, or a player
// left homeless fails loudly here instead of silently breaking the path.
describe('authored curriculum', () => {
  const defs = unitDefs();
  const ids = new Set(players.map((p) => p.player_id));

  it('has at least one unit', () => {
    expect(defs.length).toBeGreaterThan(0);
  });

  it('every unit slug is unique and non-empty', () => {
    const slugs = defs.map((d) => d.slug);
    expect(slugs.every(Boolean)).toBe(true);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every owned/cameo id refers to a real player', () => {
    for (const d of defs) {
      for (const id of [...d.owned, ...d.cameo]) {
        expect(ids.has(id), `${d.slug}: unknown player_id ${id}`).toBe(true);
      }
    }
  });

  it('every player is owned by exactly one unit', () => {
    const owners = new Map<string, string[]>();
    for (const d of defs) {
      for (const id of d.owned) {
        const arr = owners.get(id) ?? [];
        arr.push(d.slug);
        owners.set(id, arr);
      }
    }
    // no player owned twice
    for (const [id, us] of owners) {
      expect(us.length, `player ${id} owned by ${us.join(', ')}`).toBe(1);
    }
    // no player left homeless
    for (const id of ids) {
      expect(owners.has(id), `player ${id} is not owned by any unit`).toBe(true);
    }
  });

  it('no player is a cameo in a unit that also owns them', () => {
    for (const d of defs) {
      const owned = new Set(d.owned);
      for (const id of d.cameo) {
        expect(owned.has(id), `${d.slug}: ${id} is both owned and cameo`).toBe(false);
      }
    }
  });

  it('a cameo player is owned by an EARLIER unit (review-only back refs)', () => {
    const ownedByIndex = new Map<string, number>();
    defs.forEach((d, i) => d.owned.forEach((id) => ownedByIndex.set(id, i)));
    defs.forEach((d, i) => {
      for (const id of d.cameo) {
        const home = ownedByIndex.get(id);
        expect(home, `${d.slug}: cameo ${id} has no home unit`).not.toBeUndefined();
        expect(home! < i, `${d.slug}: cameo ${id} is owned by a later unit`).toBe(true);
      }
    });
  });

  it('every motif is valid (team colors or a whitelisted icon)', () => {
    const validTeams = new Set(teams.map((t) => teamThemeSlug(t.name)));
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const d of defs) {
      const m = d.motif;
      if (m.kind === 'team') {
        expect(m.teams.length, `${d.slug}: team motif needs 1–2 teams`).toBeGreaterThanOrEqual(1);
        expect(m.teams.length).toBeLessThanOrEqual(2);
        for (const s of m.teams) {
          expect(validTeams.has(s), `${d.slug}: unknown team ${s}`).toBe(true);
        }
      } else if (m.kind === 'icon') {
        expect(MOTIF_ICON_NAMES.includes(m.icon), `${d.slug}: unknown icon ${m.icon}`).toBe(true);
        expect(hex.test(m.accent), `${d.slug}: bad accent ${m.accent}`).toBe(true);
      } else {
        throw new Error(`${d.slug}: unknown motif kind`);
      }
    }
  });

  it('loadCurriculum resolves in order with owned as playerIds', () => {
    const units = loadCurriculum();
    expect(units.length).toBe(defs.length);
    units.forEach((u, i) => {
      expect(u.index).toBe(i);
      expect(u.key).toBe(defs[i].slug);
      expect(u.playerIds).toEqual(defs[i].owned);
      expect(u.cameoIds).toEqual(defs[i].cameo);
    });
  });
});
