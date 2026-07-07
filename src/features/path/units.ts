// Memoized curriculum unit list keyed by focus-team selection, so the path and
// lesson screens derive the same units. Thin wrapper over deriveCurriculum.
import { deriveCurriculum, type Unit } from '../../data/curriculum';
import { players } from '../../data/dataset';

const cache = new Map<string, Unit[]>();

export function curriculumUnits(focusTeams: readonly string[]): Unit[] {
  const key = [...focusTeams].sort().join('|');
  let units = cache.get(key);
  if (!units) {
    units = deriveCurriculum(players, [...focusTeams]);
    cache.set(key, units);
  }
  return units;
}
