// Maps team names to CSS theme slugs used by [data-team-theme]. Derived from
// the team slug in the dataset so it stays in sync.
import { teamByName } from '../data/dataset';

/** slug without the trailing id, e.g. "savannah-bananas-12f2948d" -> "savannah-bananas" */
export function teamThemeSlug(teamName: string): string {
  const team = teamByName.get(teamName);
  if (!team) return '';
  return team.slug.replace(/-[0-9a-f]{8}$/, '');
}
