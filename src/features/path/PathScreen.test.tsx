import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// localStorage shim for the persisted store in jsdom.
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

describe('PathScreen (smoke)', () => {
  it('renders the derived curriculum without crashing (no render loop)', async () => {
    const { PathScreen } = await import('./PathScreen');
    render(
      <MemoryRouter>
        <PathScreen />
      </MemoryRouter>,
    );
    // Tier banner from the derived curriculum should be present.
    expect(screen.getByText(/The players everyone knows/i)).toBeTruthy();
    expect(screen.getAllByText(/leads with/i).length).toBeGreaterThan(0);
    // header shows XP
    expect(screen.getByText(/XP/)).toBeTruthy();
  });
});
