import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RotateCw, Star, Lock } from 'lucide-react';
import { useStore } from '../../store';
import { getPlayer } from '../../data/dataset';
import { warmUnitImages } from '../../lib/images';
import { ACT_BANNER, type UnitMotif } from '../../data/curriculum';
import { curriculumUnits } from './units';
import { computePathProgress, type UnitProgress } from './progress';
import { levelForXp } from '../../engine/gamification/xp';
import { teamColor, readableInk } from '../../lib/theme';
import { motifIcon } from '../../lib/motif';
import { dueCount } from '../practice/due';

export function PathScreen() {
  const streakCurrent = useStore((s) => s.profile.streak.current);
  const totalXp = useStore((s) => s.profile.totalXp);
  const pathState = useStore((s) => s.path);
  const srs = useStore((s) => s.players);
  const level = levelForXp(totalXp);

  const units = curriculumUnits();
  const progress = computePathProgress(units, pathState, srs);
  const due = dueCount(srs);

  // Warm the current active unit's headshots on idle so the next lesson's
  // images are ready and offline-safe.
  const activeUnit = progress.find((p) => p.status === 'active');
  useEffect(() => {
    if (activeUnit) warmUnitImages(activeUnit.unit.playerIds.map(getPlayer));
  }, [activeUnit]);

  return (
    <div className="flex flex-col gap-4 pb-24">
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--hairline)' }}
      >
        <div className="flex items-center gap-1 text-lg font-black">🔥 <span>{streakCurrent}</span></div>
        <div className="text-right">
          <div className="text-xs font-bold text-[var(--muted)]">{level.title}</div>
          <div className="text-sm font-black">{totalXp} XP</div>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-5">
        {progress.map((p, i) => {
          const firstOfAct = i === 0 || progress[i - 1].unit.act !== p.unit.act;
          const banner = ACT_BANNER[p.unit.act];
          return (
            <div key={p.unit.key}>
              {firstOfAct && banner && (
                <div className="mb-2 mt-4 rounded-2xl bg-[var(--team-soft)] px-4 py-2">
                  <div className="text-sm font-black">{banner.name}</div>
                  <div className="text-xs text-[var(--muted)]">{banner.blurb}</div>
                </div>
              )}
              <UnitCard progress={p} srs={srs} />
            </div>
          );
        })}
      </div>

      {due > 0 && (
        <Link
          to="/practice"
          className="fixed bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[var(--bad)] px-5 py-3 font-black text-white shadow-lg transition active:scale-95"
        >
          <span className="flex items-center gap-2">
            <RotateCw size={18} aria-hidden /> {due} review{due === 1 ? '' : 's'} due
          </span>
        </Link>
      )}
    </div>
  );
}

function UnitCard({
  progress: p,
  srs,
}: {
  progress: UnitProgress;
  srs: Record<string, { box: number }>;
}) {
  const locked = p.status === 'locked';
  const complete = p.status === 'complete';
  const showQuiz = p.quizUnlocked && !p.quizPassed;

  // The unit's accent color drives the border and mastered pips. It comes from
  // the motif: the team color for a team unit, the accent hex for an icon unit.
  const color = motifColor(p.unit.motif);

  // Locked units stay minimal (one line). Unlocked units (active/complete) show
  // the theme line plus a status line beneath it.
  const status = complete
    ? `Mastered ${p.mastered}/${p.owned}`
    : showQuiz
      ? 'Unit quiz ready!'
      : p.introduced > 0
        ? `Learning · ${p.introduced}/${p.owned} met`
        : `${p.owned} players`;

  const inner = (
    <div
      className={`flex flex-col gap-2 rounded-[var(--radius)] border-2 p-3 transition ${
        locked ? 'opacity-70' : 'active:scale-[0.99]'
      }`}
      style={{ borderColor: complete ? color : 'var(--hairline)', background: 'var(--surface)' }}
    >
      {/* top row: badge · title+status · pips */}
      <div className="flex items-center gap-3">
        <UnitBadge motif={p.unit.motif} complete={complete} locked={locked} index={p.unit.index} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{p.unit.title}</div>
          <div className="truncate text-xs font-semibold" style={{ color: locked ? 'var(--muted)' : color }}>
            {locked ? `${p.owned} players · locked` : status}
          </div>
        </div>
        {/* mastery pips — one per OWNED player */}
        {!locked && (
          <div className="flex flex-wrap justify-end gap-0.5" style={{ maxWidth: 72 }}>
            {p.unit.playerIds.map((id) => (
              <span
                key={id}
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: (srs[id]?.box ?? 0) >= 5 ? color : 'var(--hairline)' }}
              />
            ))}
          </div>
        )}
      </div>
      {/* full-width theme line beneath, so it isn't squeezed by the title row */}
      {!locked && <div className="text-xs text-[var(--muted)]">{p.unit.theme}</div>}
    </div>
  );

  if (locked) return inner;

  // active/complete units are playable. Quiz link when unlocked & not passed.
  const to = showQuiz
    ? `/lesson/${p.unit.key}?mode=quiz`
    : `/lesson/${p.unit.key}?attempt=${p.lessonsDone}`;
  return <Link to={to}>{inner}</Link>;
}

/** Primary accent color for a unit's motif — used for border/pips/badge. */
function motifColor(motif: UnitMotif): string {
  return motif.kind === 'team' ? teamColor(motif.teams[0]) : motif.accent;
}

/** The round unit badge. Its look follows the unit's motif:
 *   - complete → a star; locked → a lock (muted);
 *   - team motif → the team color (or a two-team diagonal gradient for a clash);
 *   - icon motif → the themed icon on its accent color.
 *  Active state always wins the star/lock glyph over the motif icon/number. */
function UnitBadge({
  motif,
  complete,
  locked,
  index,
}: {
  motif: UnitMotif;
  complete: boolean;
  locked: boolean;
  index: number;
}) {
  const active = complete || !locked;

  const baseColor = motif.kind === 'team' ? teamColor(motif.teams[0]) : motif.accent;
  let background = 'var(--hairline)';
  let ink = 'var(--muted)';
  if (active) {
    ink = readableInk(baseColor);
    if (motif.kind === 'team' && motif.teams.length > 1) {
      const c2 = teamColor(motif.teams[1]);
      background = `linear-gradient(135deg, ${baseColor} 0%, ${baseColor} 45%, ${c2} 55%, ${c2} 100%)`;
    } else {
      background = baseColor;
    }
  }

  // Glyph precedence: completed star > locked lock > motif icon > unit number.
  let glyph: React.ReactNode;
  if (complete) {
    glyph = <Star size={20} fill="currentColor" aria-hidden />;
  } else if (locked) {
    glyph = <Lock size={18} aria-hidden />;
  } else if (motif.kind === 'icon') {
    const Icon = motifIcon(motif.icon);
    glyph = <Icon size={20} aria-hidden />;
  } else {
    glyph = index + 1;
  }

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-black"
      style={{ background, color: ink }}
    >
      {glyph}
    </div>
  );
}
