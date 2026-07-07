import { Link } from 'react-router-dom';
import { useStore } from '../../store';
import { getPlayer } from '../../data/dataset';
import { ACT_BY_TIER } from '../../data/curriculum';
import { curriculumUnits } from './units';
import { levelForXp } from '../../engine/gamification/xp';
import { teamThemeSlug } from '../../lib/theme';

/**
 * Stage 4 Path: header (streak/XP/level) + the derived unit list, themed.
 * This proves data + store + theming integration. The interactive node map
 * arrives in Stage 6.
 */
export function PathScreen() {
  const focusTeams = useStore((s) => s.profile.settings.focusTeams);
  const streakCurrent = useStore((s) => s.profile.streak.current);
  const totalXp = useStore((s) => s.profile.totalXp);
  const level = levelForXp(totalXp);

  const units = curriculumUnits(focusTeams);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--hairline)' }}
      >
        <div className="flex items-center gap-1 text-lg font-black">
          🔥 <span>{streakCurrent}</span>
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-[var(--muted)]">{level.title}</div>
          <div className="text-sm font-black">{totalXp} XP</div>
        </div>
        <Link to="/settings" className="text-xl" aria-label="Settings">
          ⚙️
        </Link>
      </header>

      <div className="flex flex-col gap-3 px-5">
        {units.map((u, i) => {
          const firstOfAct = i === 0 || units[i - 1].act !== u.act;
          const lead = getPlayer(u.playerIds[0]);
          return (
            <div key={u.key}>
              {firstOfAct && (
                <h2 className="mt-3 mb-1 text-xs font-black uppercase tracking-wide text-[var(--muted)]">
                  Act {u.act} · {ACT_BY_TIER[u.tier].name}
                </h2>
              )}
              <Link
                to={`/lesson/${u.key}`}
                data-team-theme={teamThemeSlug(lead.team_name)}
                className="flex items-center gap-3 rounded-[var(--radius)] border-2 p-3 transition active:scale-[0.99]"
                style={{ borderColor: 'var(--hairline)', background: 'var(--surface)' }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black"
                  style={{ background: 'var(--team)', color: 'var(--team-ink)' }}
                >
                  {u.index + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-bold">Unit {u.index + 1}</div>
                  <div className="truncate text-xs text-[var(--muted)]">
                    {u.playerIds.length} players · leads with {lead.name}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
