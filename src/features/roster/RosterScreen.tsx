import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store';
import { players, teams } from '../../data/dataset';
import { PlayerImage } from '../shared/PlayerImage';
import { StrengthMeter } from './StrengthMeter';
import { teamThemeSlug } from '../../lib/theme';
import { isDue } from '../../engine/srs/scheduler';
import { newSrsRecord } from '../../engine/srs/types';

type Filter = 'all' | 'known' | 'mastered' | 'locked';

export function RosterScreen() {
  const srs = useStore((s) => s.players);
  const [query, setQuery] = useState('');
  const [team, setTeam] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const now = Date.now();
  const rec = (id: string) => srs[id] ?? newSrsRecord();
  const introducedTotal = players.filter((p) => rec(p.player_id).introducedAt != null).length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter((p) => {
      if (team && p.team_name !== team) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      const r = rec(p.player_id);
      const known = r.introducedAt != null;
      if (filter === 'known' && !known) return false;
      if (filter === 'mastered' && r.box < 5) return false;
      if (filter === 'locked' && known) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, team, filter, srs]);

  return (
    <div className="flex flex-col gap-4 px-5 py-6 pb-24">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-black">Roster</h1>
        <span className="text-sm font-bold text-[var(--muted)]">
          {introducedTotal}/{players.length} collected
        </span>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search players…"
        className="w-full rounded-2xl border-2 border-[var(--hairline)] bg-transparent p-3 font-semibold"
      />

      {/* filter chips */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'known', 'mastered', 'locked'] as Filter[]).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </Chip>
        ))}
        <Chip active={team === null} onClick={() => setTeam(null)}>
          All teams
        </Chip>
        {teams.map((t) => (
          <Chip key={t.team_id} active={team === t.name} onClick={() => setTeam(t.name)}>
            {t.abbreviation}
          </Chip>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {shown.map((p) => {
          const r = rec(p.player_id);
          const known = r.introducedAt != null;
          const overdue = known && isDue(r, now);
          const legendary = r.legendary;
          if (!known) {
            return (
              <div
                key={p.player_id}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-[var(--hairline)] p-2 opacity-70"
              >
                <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-[var(--hairline)] text-2xl">
                  ❓
                </div>
                <span className="text-[11px] font-bold text-[var(--muted)]">???</span>
              </div>
            );
          }
          return (
            <Link
              key={p.player_id}
              to={`/roster/${p.slug}`}
              data-team-theme={teamThemeSlug(p.team_name)}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-2 transition active:scale-[0.98] ${
                legendary ? 'border-[var(--team)]' : 'border-[var(--hairline)]'
              }`}
              style={legendary ? { boxShadow: '0 0 0 2px var(--team) inset' } : undefined}
            >
              <PlayerImage player={p} size={90} rounded="rounded-xl" className="w-full" />
              <span className="w-full truncate text-center text-[11px] font-bold">{p.name}</span>
              <StrengthMeter box={r.box} overdue={overdue} />
            </Link>
          );
        })}
      </div>

      {shown.length === 0 && (
        <p className="py-8 text-center text-[var(--muted)]">No players match.</p>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition ${
        active ? 'border-[var(--banana-dark,#f4b400)] bg-[var(--color-banana,#ffd23f)] text-black' : 'border-[var(--hairline)]'
      }`}
    >
      {children}
    </button>
  );
}
