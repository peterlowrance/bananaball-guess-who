// Review-due helpers shared by the path badge and the practice hub.
import { players } from '../../data/dataset';
import { isDue } from '../../engine/srs/scheduler';
import { newSrsRecord, type SrsRecord } from '../../engine/srs/types';

export function dueCount(
  srs: Record<string, SrsRecord>,
  focusTeams: readonly string[],
  now = Date.now(),
): number {
  const focus = new Set(focusTeams);
  let n = 0;
  for (const p of players) {
    if (focus.size && !focus.has(p.team_name)) continue;
    if (isDue(srs[p.player_id] ?? newSrsRecord(), now)) n++;
  }
  return n;
}

export function introducedCount(srs: Record<string, SrsRecord>): number {
  return Object.values(srs).filter((r) => r.introducedAt != null).length;
}
