import { useEffect, useRef, useState } from 'react';
import type { Player } from '../../data/types';
import { players as allPlayers } from '../../data/dataset';
import { teamThemeSlug } from '../../lib/theme';

// Reports which player images have failed this session so the session builder
// can avoid photo questions for them (plan §3.9). Module-level so it survives
// component remounts within a session.
const brokenImages = new Set<string>();

// Players with no verified photo from any source (e.g. the Clowns' mascot
// "Peanuts The Elephant") are broken up front, so the session builder never
// asks a photo-target question we can't illustrate — it renders the initials
// avatar instead of flashing a broken image.
for (const p of allPlayers) {
  const hasPhoto = (p.images?.length ?? 0) > 0 || !!p.image_url;
  if (!hasPhoto) brokenImages.add(p.player_id);
}
export function isImageBroken(playerId: string): boolean {
  return brokenImages.has(playerId);
}
export function brokenImageIds(): ReadonlySet<string> {
  return brokenImages;
}

interface Props {
  player: Player;
  size?: number;
  className?: string;
  rounded?: string; // tailwind rounding class
}

/** A player's verified photos, most-canonical first. Falls back to the legacy
 *  single image_url for older cached datasets that predate images[]. */
function photosFor(player: Player): string[] {
  if (Array.isArray(player.images) && player.images.length > 0) return player.images;
  return player.image_url ? [player.image_url] : [];
}

/** Deterministic small hash of a string → non-negative int. Used to vary which
 *  photo a player leads with, stably per player (no flicker on re-render) but
 *  spread across the roster so repeated players don't all show shot #1. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Renders a player photo with a skeleton while loading and a team-colored
 * initials avatar on error/timeout. Never leaves a broken <img> visible.
 *
 * When a player has multiple verified photos (neutral stats headshot + official
 * media-day shot), we lead with a per-player-stable pick for variety and walk
 * to the next photo if one fails, only falling back to initials once every
 * photo is exhausted (or the player has none).
 */
export function PlayerImage({ player, size = 120, className = '', rounded = 'rounded-2xl' }: Props) {
  const photos = photosFor(player);
  // Stable per-player starting offset so the roster shows a mix of shots.
  const startAt = photos.length > 1 ? hashStr(player.player_id) % photos.length : 0;
  // attempt indexes into `photos` (rotated by startAt); advances on failure.
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>(
    photos.length === 0 || isImageBroken(player.player_id) ? 'error' : 'loading',
  );
  const timer = useRef<number | undefined>(undefined);

  const src = photos.length ? photos[(startAt + attempt) % photos.length] : undefined;
  const triedAll = attempt >= photos.length - 1;

  // Reset when the player changes (component is often reused across questions).
  useEffect(() => {
    setAttempt(0);
    setStatus(photos.length === 0 || isImageBroken(player.player_id) ? 'error' : 'loading');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.player_id]);

  // Advance to the next photo, or give up (mark broken) once all are exhausted.
  const fail = () => {
    window.clearTimeout(timer.current);
    if (triedAll) {
      brokenImages.add(player.player_id);
      setStatus('error');
    } else {
      setAttempt((a) => a + 1);
      setStatus('loading');
    }
  };

  useEffect(() => {
    if (status !== 'loading') return;
    // 4s timeout -> treat this photo as broken (slow/blocked hotlink)
    timer.current = window.setTimeout(fail, 4000);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, attempt, player.player_id]);

  const box = { width: size, height: size } as const;

  if (status === 'error') {
    return (
      <InitialsAvatar player={player} size={size} className={className} rounded={rounded} />
    );
  }

  return (
    <div className={`relative ${className}`} style={box}>
      {status === 'loading' && (
        <div className={`absolute inset-0 animate-pulse bg-[var(--team-soft)] ${rounded}`} />
      )}
      <img
        // key on the attempt so a fallback swap actually reloads the element
        key={attempt}
        src={src}
        alt={player.name}
        width={size}
        height={size}
        loading="lazy"
        onLoad={() => {
          window.clearTimeout(timer.current);
          setStatus('ok');
        }}
        onError={fail}
        className={`h-full w-full object-cover ${rounded} ${status === 'ok' ? '' : 'opacity-0'}`}
      />
    </div>
  );
}

export function InitialsAvatar({
  player,
  size = 120,
  className = '',
  rounded = 'rounded-2xl',
}: Props) {
  const initials = player.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <div
      data-team-theme={teamThemeSlug(player.team_name)}
      className={`flex flex-col items-center justify-center ${rounded} ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, var(--team), var(--team-soft))',
        color: 'var(--team-ink)',
      }}
      aria-label={player.name}
    >
      <span style={{ fontSize: size * 0.3 }} className="font-black leading-none">
        {initials}
      </span>
      <span style={{ fontSize: size * 0.16 }} className="mt-1 font-bold opacity-70">
        #{player.jersey_number}
      </span>
    </div>
  );
}
