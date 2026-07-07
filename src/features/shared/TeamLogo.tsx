import { useState } from 'react';
import { teamThemeSlug } from '../../lib/theme';

// Locally bundled team logos (hotlinking thebananaball.com/stats/teams/* is
// blocked by ORB — those URLs serve HTML, not images). Missing logos fall back
// to a themed initials chip. Correct/complete logo set is finalized in Stage M.
const LOGOS: Record<string, string> = {
  'savannah-bananas': `${import.meta.env.BASE_URL}logos/savannah-bananas.png`,
  firefighters: `${import.meta.env.BASE_URL}logos/firefighters.png`,
  'party-animals': `${import.meta.env.BASE_URL}logos/party-animals.png`,
  'texas-tailgaters': `${import.meta.env.BASE_URL}logos/texas-tailgaters.png`,
  'loco-beach-coconuts': `${import.meta.env.BASE_URL}logos/loco-beach-coconuts.png`,
  'indianapolis-clowns': `${import.meta.env.BASE_URL}logos/indianapolis-clowns.png`,
};

export function teamLogoSrc(teamName: string): string | null {
  return LOGOS[teamThemeSlug(teamName)] ?? null;
}

export function TeamLogo({
  teamName,
  size = 28,
  className = '',
}: {
  teamName: string;
  size?: number;
  className?: string;
}) {
  const slug = teamThemeSlug(teamName);
  const src = LOGOS[slug];
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const abbr = teamName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
    return (
      <span
        data-team-theme={slug}
        className={`inline-flex items-center justify-center rounded font-black ${className}`}
        style={{
          width: size,
          height: size,
          background: 'var(--team)',
          color: 'var(--team-ink)',
          fontSize: size * 0.34,
        }}
        aria-label={teamName}
      >
        {abbr}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={teamName}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
