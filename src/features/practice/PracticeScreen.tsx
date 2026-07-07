import { Link } from 'react-router-dom';
import { useStore } from '../../store';
import { teams } from '../../data/dataset';
import { TeamLogo } from '../shared/TeamLogo';
import { teamThemeSlug } from '../../lib/theme';
import { dueCount, introducedCount } from './due';
import { useState } from 'react';

export function PracticeScreen() {
  const focusTeams = useStore((s) => s.profile.settings.focusTeams);
  const srs = useStore((s) => s.players);
  const due = dueCount(srs, focusTeams);
  const introduced = introducedCount(srs);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (name: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });

  const teamDrillHref =
    selected.size > 0
      ? `/practice/run?mode=teams&teams=${encodeURIComponent([...selected].join(','))}`
      : null;

  return (
    <div className="flex flex-col gap-6 px-5 py-6 pb-24">
      <h1 className="text-2xl font-black">Practice</h1>

      {/* Review due */}
      {due > 0 ? (
        <Link
          to="/practice/run?mode=review"
          className="flex items-center justify-between rounded-[var(--radius)] bg-[var(--bad)] p-5 font-black text-white active:scale-[0.99]"
        >
          <span>🔁 Review due</span>
          <span className="rounded-full bg-white/25 px-3 py-1">{due}</span>
        </Link>
      ) : (
        <div className="rounded-[var(--radius)] border-2 border-[var(--hairline)] p-5 text-center">
          <p className="font-black">All caught up! 🎉</p>
          <p className="mt-1 text-sm text-[var(--muted)]">No reviews due right now.</p>
          {introduced > 0 && (
            <Link
              to="/practice/run?mode=review&any=1"
              className="mt-3 inline-block rounded-2xl border-2 border-[var(--hairline)] px-4 py-2 text-sm font-bold"
            >
              Practice anyway
            </Link>
          )}
        </div>
      )}

      {/* Weak spots */}
      {introduced >= 4 && (
        <Link
          to="/practice/run?mode=weak"
          className="rounded-[var(--radius)] border-2 border-[var(--hairline)] p-4 font-bold active:scale-[0.99]"
        >
          🎯 Weak spots — drill your lowest-accuracy players
        </Link>
      )}

      {/* Team drills */}
      <section>
        <h2 className="mb-1 font-black">Team drills</h2>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Pick one or more teams to practice players you've met.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {teams.map((t) => {
            const on = selected.has(t.name);
            return (
              <button
                key={t.team_id}
                data-team-theme={teamThemeSlug(t.name)}
                onClick={() => toggle(t.name)}
                className={`flex items-center gap-2 rounded-2xl border-2 p-2 text-left text-sm font-bold transition ${
                  on ? 'border-[var(--team)] bg-[var(--team-soft)]' : 'border-[var(--hairline)]'
                }`}
              >
                <TeamLogo teamName={t.name} size={28} />
                <span className="leading-tight">{t.name}</span>
              </button>
            );
          })}
        </div>
        {teamDrillHref ? (
          <Link
            to={teamDrillHref}
            className="mt-3 block rounded-2xl bg-[var(--ok)] py-3 text-center font-black text-white"
          >
            Start drill ({selected.size} {selected.size === 1 ? 'team' : 'teams'})
          </Link>
        ) : (
          <button
            disabled
            className="mt-3 block w-full rounded-2xl bg-[var(--hairline)] py-3 text-center font-black text-[var(--muted)]"
          >
            Select teams to drill
          </button>
        )}
      </section>
    </div>
  );
}
