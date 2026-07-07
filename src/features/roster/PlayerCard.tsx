import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { useStore } from '../../store';
import { playerBySlug } from '../../data/dataset';
import { PlayerImage } from '../shared/PlayerImage';
import { TeamLogo } from '../shared/TeamLogo';
import { StrengthMeter } from './StrengthMeter';
import { teamThemeSlug } from '../../lib/theme';
import { newSrsRecord } from '../../engine/srs/types';

export function PlayerCard() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const srs = useStore((s) => s.players);
  const player = playerBySlug.get(slug);

  if (!player) {
    return (
      <div className="p-8 text-center">
        <p className="font-bold">Player not found.</p>
        <button onClick={() => navigate('/roster')} className="mt-4 underline">
          Back to roster
        </button>
      </div>
    );
  }

  const r = srs[player.player_id] ?? newSrsRecord();
  const known = r.introducedAt != null;
  const accuracy = r.seen ? Math.round((r.correct / r.seen) * 100) : 0;

  return (
    <div
      data-team-theme={teamThemeSlug(player.team_name)}
      className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto"
      style={{ background: 'var(--bg)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate('/roster')}
          aria-label="Back"
          className="transition active:scale-90"
        >
          <ChevronLeft size={24} aria-hidden />
        </button>
        <span className="font-black">{player.name}</span>
      </div>

      <div className="flex flex-col items-center gap-4 px-6 pb-24">
        {/* trading-card frame */}
        <div
          className="w-full max-w-xs overflow-hidden rounded-[2rem] border-4 p-4"
          style={{ borderColor: 'var(--team)', background: 'var(--surface)' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <TeamLogo teamName={player.team_name} size={40} />
            <span className="text-3xl font-black text-[var(--team)]">#{player.jersey_number}</span>
          </div>
          <PlayerImage player={player} size={280} rounded="rounded-2xl" className="mx-auto w-full" />
          <h1 className="mt-3 text-center text-2xl font-black">{player.name}</h1>
          <p className="text-center text-sm font-bold text-[var(--muted)]">
            {player.position_label} · {player.team_name}
          </p>
          {known && (
            <div className="mt-3">
              <StrengthMeter box={r.box} />
              <p className="mt-1 flex items-center justify-center gap-1 text-center text-xs text-[var(--muted)]">
                {r.legendary && (
                  <span className="inline-flex items-center gap-1 font-black text-[var(--team-ink)]">
                    <Sparkles size={13} aria-hidden /> Legendary ·
                  </span>
                )}
                {accuracy}% accuracy over {r.seen} question{r.seen === 1 ? '' : 's'}
              </p>
            </div>
          )}
        </div>

        {/* stats */}
        {player.hitting && (
          <StatBlock
            title="Hitting"
            rows={[
              ['G', player.hitting.g],
              ['AB', player.hitting.ab],
              ['H', player.hitting.h],
              ['HR', player.hitting.hr],
              ['RBI', player.hitting.rbi],
              ['AVG', player.hitting.avg],
              ['OPS', player.hitting.ops],
            ]}
          />
        )}
        {player.pitching && (
          <StatBlock
            title="Pitching"
            rows={[
              ['G', player.pitching.g ?? '—'],
              ['W', player.pitching.w ?? '—'],
              ['L', player.pitching.l ?? '—'],
              ['SV', player.pitching.sv ?? '—'],
              ['IP', player.pitching.ip ?? '—'],
              ['ERA', player.pitching.era ?? '—'],
            ]}
          />
        )}

        {!known && (
          <p className="text-center text-sm text-[var(--muted)]">
            Learn this player on the path to unlock their stats and strength.
          </p>
        )}
      </div>
    </div>
  );
}

function StatBlock({ title, rows }: { title: string; rows: [string, string | number][] }) {
  return (
    <div className="w-full max-w-xs rounded-2xl bg-[var(--surface)] p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-[var(--muted)]">{title}</h2>
      <div className="grid grid-cols-4 gap-y-2 text-center">
        {rows.map(([label, val]) => (
          <div key={label}>
            <div className="font-black">{val}</div>
            <div className="text-[10px] font-bold text-[var(--muted)]">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
