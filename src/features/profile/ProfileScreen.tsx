import { useStore } from '../../store';
import { levelForXp, LEVELS } from '../../engine/gamification/xp';
import { ACHIEVEMENTS } from '../../engine/gamification/achievements';
import { introducedCount } from '../practice/due';
import { players } from '../../data/dataset';
import { SettingsPanel } from '../settings/SettingsScreen';
import { Lock } from 'lucide-react';

export function ProfileScreen() {
  const profile = useStore((s) => s.profile);
  const srs = useStore((s) => s.players);
  const level = levelForXp(profile.totalXp);
  const introduced = introducedCount(srs);
  const mastered = Object.values(srs).filter((r) => r.box >= 5).length;
  const unlocked = new Set(profile.achievements);

  const currentMin = LEVELS[level.level].min;
  const toNext = level.next ? level.next.min - profile.totalXp : 0;
  const levelPct = level.next
    ? Math.round(((profile.totalXp - currentMin) / (level.next.min - currentMin)) * 100)
    : 100;

  return (
    <div className="flex flex-col gap-6 px-5 py-6 pb-24">
      <h1 className="text-2xl font-black">Profile</h1>

      {/* Level + XP */}
      <section className="rounded-[var(--radius)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-black">{level.title}</span>
          <span className="text-sm font-bold text-[var(--muted)]">{profile.totalXp} XP</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--hairline)]">
          <div className="h-full rounded-full bg-[var(--banana-dark,#f4b400)]" style={{ width: `${levelPct}%` }} />
        </div>
        {level.next && (
          <p className="mt-2 text-xs text-[var(--muted)]">{toNext} XP to {level.next.title}</p>
        )}
      </section>

      {/* Key numbers */}
      <section className="grid grid-cols-3 gap-3">
        <StatTile label="Day streak" value={`🔥 ${profile.streak.current}`} />
        <StatTile label="Collected" value={`${introduced}/${players.length}`} />
        <StatTile label="Mastered" value={`${mastered}`} />
      </section>

      {/* Personal bests */}
      <section>
        <h2 className="mb-2 font-black">Personal bests</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Longest streak" value={`${profile.streak.longest} days`} small />
          <StatTile label="Best XP day" value={`${profile.bests.bestXpDay} XP`} small />
        </div>
      </section>

      {/* Achievements */}
      <section>
        <h2 className="mb-2 font-black">
          Achievements <span className="text-sm text-[var(--muted)]">({unlocked.size}/{ACHIEVEMENTS.length})</span>
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const got = unlocked.has(a.id);
            return (
              <div
                key={a.id}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center ${
                  got ? 'border-[var(--team)] bg-[var(--team-soft)]' : 'border-[var(--hairline)] opacity-60'
                }`}
              >
                <span className="flex h-8 items-center justify-center text-2xl">
                  {got ? '🏅' : <Lock size={22} className="text-[var(--muted)]" aria-hidden />}
                </span>
                <span className="text-[11px] font-bold leading-tight">{a.name}</span>
                <span className="text-[10px] leading-tight text-[var(--muted)]">
                  {got ? 'Unlocked' : a.hint}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Settings live at the bottom of Profile */}
      <SettingsPanel />
    </div>
  );
}

function StatTile({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-[var(--surface)] p-3 text-center shadow-sm">
      <div className={small ? 'text-base font-black' : 'text-xl font-black'}>{value}</div>
      <div className="text-xs font-bold text-[var(--muted)]">{label}</div>
    </div>
  );
}
