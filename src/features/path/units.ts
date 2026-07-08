// The learning path — the hand-authored curriculum, loaded once and shared by
// the path and lesson screens. Thin cached wrapper over loadCurriculum.
import { loadCurriculum, type Unit } from '../../data/curriculum';

let cached: Unit[] | null = null;

export function curriculumUnits(): Unit[] {
  if (!cached) cached = loadCurriculum();
  return cached;
}
