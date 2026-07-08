import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PlayerImage } from './PlayerImage';
import type { Player } from '../../data/types';

afterEach(cleanup);

function makePlayer(over: Partial<Player>): Player {
  return {
    player_id: over.player_id ?? 'p1',
    slug: 'test-player',
    name: over.name ?? 'Test Player',
    team_id: 't1',
    team_name: 'Firefighters',
    jersey_number: 7,
    position_label: 'Relief Pitcher',
    image_url: over.image_url ?? null,
    images: over.images ?? [],
    hitting: null,
    pitching: null,
    difficulty: 'easy',
    popularity_rank: 1,
    popularity_confidence: 'high',
    ...over,
  };
}

describe('PlayerImage', () => {
  it('renders an <img> from images[] when photos exist', () => {
    const p = makePlayer({
      player_id: 'has-photos',
      images: ['https://a.example/one.jpg', 'https://b.example/two.jpg'],
      image_url: 'https://a.example/one.jpg',
    });
    render(<PlayerImage player={p} />);
    const img = screen.getByAltText('Test Player');
    expect(img.tagName).toBe('IMG');
    // src is one of the player's verified photos (start offset may rotate it).
    expect(p.images).toContain(img.getAttribute('src'));
  });

  it('shows the initials avatar (no <img>) when the player has no photos', () => {
    const p = makePlayer({ player_id: 'no-photos', name: 'Peanuts The Elephant', images: [], image_url: null });
    render(<PlayerImage player={p} />);
    // Fallback is a div with aria-label, never a broken <img>.
    const el = screen.getByLabelText('Peanuts The Elephant');
    expect(el.tagName).not.toBe('IMG');
    expect(screen.queryByRole('img')).toBeNull();
    // Initials from the first two name words.
    expect(el.textContent).toContain('PT');
  });

  it('falls back to the next photo when one errors, before giving up', () => {
    const p = makePlayer({
      player_id: 'walks-fallbacks',
      images: ['https://a.example/one.jpg', 'https://b.example/two.jpg'],
      image_url: 'https://a.example/one.jpg',
    });
    render(<PlayerImage player={p} />);
    const first = screen.getByAltText('Test Player') as HTMLImageElement;
    const firstSrc = first.getAttribute('src');
    // Error the first photo; the component should swap to the other photo, not
    // fall straight to the initials avatar.
    fireEvent.error(first);
    const second = screen.getByAltText('Test Player') as HTMLImageElement;
    expect(second.tagName).toBe('IMG');
    expect(second.getAttribute('src')).not.toBe(firstSrc);
    expect(p.images).toContain(second.getAttribute('src'));
  });

  it('falls back to initials only after every photo has failed', () => {
    const p = makePlayer({
      player_id: 'all-fail',
      images: ['https://a.example/one.jpg', 'https://b.example/two.jpg'],
      image_url: 'https://a.example/one.jpg',
    });
    render(<PlayerImage player={p} />);
    // Fail both photos in turn.
    fireEvent.error(screen.getByAltText('Test Player'));
    fireEvent.error(screen.getByAltText('Test Player'));
    // Now the initials avatar shows and no <img> remains.
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByLabelText('Test Player').tagName).not.toBe('IMG');
  });
});
