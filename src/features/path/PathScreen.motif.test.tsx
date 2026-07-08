import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Verifies the authored motifs actually reach the DOM: icon-motif units render
// a lucide glyph, team-motif units render team color / gradient, and every
// active/complete unit shows one mastery pip per owned player.
beforeAll(() => {
  if (!('localStorage' in globalThis)) {
    const m = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => m.delete(k),
      clear: () => m.clear(),
      key: (i: number) => [...m.keys()][i] ?? null,
      get length() {
        return m.size;
      },
    });
  }
});

describe('PathScreen motifs', () => {
  it('renders team gradients, icon glyphs, and per-player pips', async () => {
    const { PathScreen } = await import('./PathScreen');
    const { curriculumUnits } = await import('./units');
    const { container } = render(
      <MemoryRouter>
        <PathScreen />
      </MemoryRouter>,
    );
    const html = container.innerHTML;

    // The very first (active) unit is "Banana Stars", a single-team motif —
    // its badge carries the Savannah gold (#f5d213 → rgb(245,210,19) in jsdom)
    // with auto-selected dark ink for contrast.
    const units = curriculumUnits();
    expect(units[0].title).toBe('Banana Stars');
    expect(html).toMatch(/rgb\(245,\s*210,\s*19\)/); // savannah gold
    expect(html).toMatch(/color:\s*rgb\(27,\s*27,\s*27\)/); // dark ink on gold

    // The authored curriculum mixes team and icon motifs.
    expect(units.some((u) => u.motif.kind === 'team')).toBe(true);
    expect(units.some((u) => u.motif.kind === 'icon')).toBe(true);

    // The active unit shows exactly one pip per owned player.
    const pips = container.querySelectorAll('span.h-1\\.5.w-1\\.5');
    expect(pips.length).toBe(units[0].playerIds.length);
  });

  it('renders the theme icon (not a lock) once an icon-motif unit is active', async () => {
    const { PathScreen } = await import('./PathScreen');
    const { curriculumUnits } = await import('./units');
    const { useStore } = await import('../../store');

    // Complete every unit before the first icon-motif unit so it becomes active.
    const units = curriculumUnits();
    const firstIconIdx = units.findIndex((u) => u.motif.kind === 'icon');
    const iconUnit = units[firstIconIdx];
    for (let i = 0; i < firstIconIdx; i++) useStore.getState().passUnitQuiz(units[i].key);

    const { container } = render(
      <MemoryRouter>
        <PathScreen />
      </MemoryRouter>,
    );
    // The now-active icon unit renders its themed lucide icon in the badge.
    expect(iconUnit.motif.kind).toBe('icon');
    const iconName = iconUnit.motif.kind === 'icon' ? iconUnit.motif.icon : '';
    // 'baseball' maps to the circle-dot lucide icon; others map 1:1 by name.
    const lucideClass = iconName === 'baseball' ? 'lucide-circle-dot' : `lucide-${iconName}`;
    expect(container.innerHTML).toContain(lucideClass);
  });
});
