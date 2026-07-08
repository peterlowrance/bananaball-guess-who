// Maps team names to CSS theme slugs used by [data-team-theme]. Derived from
// the team slug in the dataset so it stays in sync.
import { teamByName } from '../data/dataset';

/** slug without the trailing id, e.g. "savannah-bananas-12f2948d" -> "savannah-bananas" */
export function teamThemeSlug(teamName: string): string {
  const team = teamByName.get(teamName);
  if (!team) return '';
  return team.slug.replace(/-[0-9a-f]{8}$/, '');
}

/** Primary team color per theme slug — MUST mirror --team in styles/themes.css.
 *  Used where a color is needed in JS (e.g. blending two teams into a gradient)
 *  and a CSS var can't be read (no element in scope). */
export const TEAM_COLOR: Record<string, string> = {
  'savannah-bananas': '#f5d213',
  'party-animals': '#ec4899',
  firefighters: '#e23b2e',
  'texas-tailgaters': '#1f6feb',
  'loco-beach-coconuts': '#12a594',
  'indianapolis-clowns': '#7c3aed',
};

/** Resolve a theme slug to its primary color, falling back to the base yellow. */
export function teamColor(slug: string | undefined): string {
  return (slug && TEAM_COLOR[slug]) || '#f4b400';
}

/** Pick black or white ink for legible text on a solid hex background, using
 *  the WCAG relative-luminance threshold. Light backgrounds (e.g. banana gold)
 *  get dark ink; saturated/dark ones get white. */
export function readableInk(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return lum > 0.5 ? '#1b1b1b' : '#ffffff';
}
