import { useEffect, useRef, useState } from 'react';
import type { Player } from '../../data/types';
import { players as allPlayers } from '../../data/dataset';
import { teamThemeSlug } from '../../lib/theme';

// Players the session builder should not pose a *photo* question about, because
// we have no image we can render for them (plan §3.9). This is now decided from
// the dataset, NOT from runtime load failures: a photo that merely loads slowly
// must never poison this set (that bug made valid players like single-photo
// Tailgaters show the initials avatar after one cold-load race). Only players
// with zero verified photos from any source (e.g. the Clowns' mascot "Peanuts
// The Elephant", whose stats URL is an HTML placeholder we strip at build time)
// land here.
const noPhotoPlayers = new Set<string>();
for (const p of allPlayers) {
  const hasPhoto = (p.images?.length ?? 0) > 0 || !!p.image_url;
  if (!hasPhoto) noPhotoPlayers.add(p.player_id);
}
export function isImageBroken(playerId: string): boolean {
  return noPhotoPlayers.has(playerId);
}
export function brokenImageIds(): ReadonlySet<string> {
  return noPhotoPlayers;
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
  // attempt indexes into `photos` (rotated by startAt); advances on a real error.
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // We give up (show the initials avatar) only when the player has NO photos, or
  // when every photo has produced a genuine load error. A slow load is NOT a
  // failure — we keep the <img> mounted and let a late onLoad win. There is no
  // timer here on purpose: the old 4s timeout raced valid images and, for
  // single-photo players, permanently flipped them to the avatar for the whole
  // session. The browser's own onError is the only "broken" signal we trust.
  const [exhausted, setExhausted] = useState(false);

  const src = photos.length ? photos[(startAt + attempt) % photos.length] : undefined;

  // Reset when the player changes (component is often reused across questions).
  // Guard on the PREVIOUS id, not just the dependency: the effect also runs on
  // mount, and an unconditional setLoaded(false) here would clobber the ref
  // callback's cache-hit detection below (the image is already complete, so
  // onLoad never fires — that reset would strand it at opacity-0 forever).
  const prevId = useRef(player.player_id);
  useEffect(() => {
    if (prevId.current === player.player_id) return; // first mount: nothing changed
    prevId.current = player.player_id;
    setAttempt(0);
    setLoaded(false);
    setExhausted(false);
  }, [player.player_id]);

  const onError = () => {
    setLoaded(false);
    if (attempt >= photos.length - 1) {
      setExhausted(true); // every photo failed -> fall back to initials
    } else {
      setAttempt((a) => a + 1); // try the next photo
    }
  };

  const box = { width: size, height: size } as const;

  if (photos.length === 0 || isImageBroken(player.player_id) || exhausted) {
    return (
      <InitialsAvatar player={player} size={size} className={className} rounded={rounded} />
    );
  }

  return (
    <div className={`relative ${className}`} style={box}>
      {!loaded && (
        <div className={`absolute inset-0 animate-pulse bg-[var(--team-soft)] ${rounded}`} />
      )}
      <img
        // key on the src so swapping to a fallback photo actually reloads
        key={src}
        src={src}
        alt={player.name}
        width={size}
        height={size}
        // A cache-hit image (e.g. the same photo shown on the intro card, then
        // again on the "Who is this?" question) can finish decoding BEFORE React
        // attaches onLoad — iOS Safari then never fires it, leaving the <img>
        // stuck at opacity-0 (a blank tile). Catch that on mount via .complete.
        // No loading="lazy": these tiles are always in-viewport and the lazy
        // decode path widens that same race.
        ref={(node) => {
          if (node?.complete && node.naturalWidth > 0) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        onError={onError}
        className={`h-full w-full object-cover ${rounded} ${loaded ? '' : 'opacity-0'}`}
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
