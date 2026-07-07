import { useEffect, useRef, useState } from 'react';
import type { Player } from '../../data/types';
import { teamThemeSlug } from '../../lib/theme';

// Reports which player images have failed this session so the session builder
// can avoid photo questions for them (plan §3.9). Module-level so it survives
// component remounts within a session.
const brokenImages = new Set<string>();
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

/**
 * Renders a player's hotlinked headshot with a skeleton while loading and an
 * initials avatar (team-colored) on error or timeout. Never leaves a broken
 * <img> visible.
 */
export function PlayerImage({ player, size = 120, className = '', rounded = 'rounded-2xl' }: Props) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>(
    isImageBroken(player.player_id) ? 'error' : 'loading',
  );
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (status !== 'loading') return;
    // 4s timeout -> treat as broken (slow/blocked hotlink)
    timer.current = window.setTimeout(() => {
      brokenImages.add(player.player_id);
      setStatus('error');
    }, 4000);
    return () => window.clearTimeout(timer.current);
  }, [status, player.player_id]);

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
        src={player.image_url}
        alt={player.name}
        width={size}
        height={size}
        loading="lazy"
        onLoad={() => {
          window.clearTimeout(timer.current);
          setStatus('ok');
        }}
        onError={() => {
          window.clearTimeout(timer.current);
          brokenImages.add(player.player_id);
          setStatus('error');
        }}
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
