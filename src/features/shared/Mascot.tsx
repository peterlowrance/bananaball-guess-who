// Team mascot head icons (sliced from the official Banana Ball wiki header,
// transparent PNGs bundled locally). Used for team identity and as celebration
// characters. Savannah Bananas' "Split" doubles as the app's guide mascot.
import { teamThemeSlug } from '../../lib/theme';

const MASCOTS: Record<string, string> = {
  'savannah-bananas': `${import.meta.env.BASE_URL}mascots/savannah-bananas.png`,
  firefighters: `${import.meta.env.BASE_URL}mascots/firefighters.png`,
  'party-animals': `${import.meta.env.BASE_URL}mascots/party-animals.png`,
  'texas-tailgaters': `${import.meta.env.BASE_URL}mascots/texas-tailgaters.png`,
  'loco-beach-coconuts': `${import.meta.env.BASE_URL}mascots/loco-beach-coconuts.png`,
  'indianapolis-clowns': `${import.meta.env.BASE_URL}mascots/indianapolis-clowns.png`,
};

/** The app's guide mascot: Split, the Savannah Bananas banana. */
export const GUIDE_MASCOT = MASCOTS['savannah-bananas'];

export function mascotSrc(teamName: string): string | null {
  return MASCOTS[teamThemeSlug(teamName)] ?? null;
}

export function Mascot({
  teamName,
  size = 64,
  className = '',
  bob = false,
  src: srcOverride,
}: {
  teamName?: string;
  size?: number;
  className?: string;
  bob?: boolean;
  src?: string;
}) {
  const src = srcOverride ?? (teamName ? mascotSrc(teamName) : null);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={teamName ? `${teamName} mascot` : 'mascot'}
      className={`object-contain ${bob ? 'animate-[bob_2.5s_ease-in-out_infinite]' : ''} ${className}`}
      style={{ height: size, width: 'auto' }}
    />
  );
}

/** Guide mascot with a Duolingo-style speech bubble. */
export function MascotSpeech({
  message,
  src = GUIDE_MASCOT,
  size = 96,
  bob = true,
}: {
  message: string;
  src?: string;
  size?: number;
  bob?: boolean;
}) {
  return (
    <div className="flex items-end gap-3">
      <img
        src={src}
        alt="mascot"
        className={bob ? 'animate-[bob_2.5s_ease-in-out_infinite]' : ''}
        style={{ height: size, width: 'auto', flexShrink: 0 }}
      />
      <div className="relative mb-2 flex-1 rounded-2xl border-2 border-[var(--hairline)] bg-[var(--surface)] p-3 text-left font-bold">
        {message}
        {/* bubble tail pointing at the mascot */}
        <span
          className="absolute left-[-9px] bottom-3 h-0 w-0"
          style={{
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: '9px solid var(--hairline)',
          }}
        />
      </div>
    </div>
  );
}
