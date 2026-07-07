import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store';
import { getPlayer } from '../../data/dataset';
import { warmUnitImages } from '../../lib/images';
import { ACT_BY_TIER } from '../../data/curriculum';
import { curriculumUnits } from './units';
import { computePathProgress, LESSONS_PER_UNIT, type UnitProgress } from './progress';
import { levelForXp } from '../../engine/gamification/xp';
import { teamThemeSlug } from '../../lib/theme';
import { dueCount } from '../practice/due';

export function PathScreen() {
  const focusTeams = useStore((s) => s.profile.settings.focusTeams);
  const streakCurrent = useStore((s) => s.profile.streak.current);
  const totalXp = useStore((s) => s.profile.totalXp);
  const pathState = useStore((s) => s.path);
  const srs = useStore((s) => s.players);
  const level = levelForXp(totalXp);

  const units = curriculumUnits(focusTeams);
  const progress = computePathProgress(units, pathState, srs);
  const due = dueCount(srs, focusTeams);

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
        <div className="text-center">
          <div className="text-xs font-bold text-[var(--muted)]">{level.title}</div>
          <div className="text-sm font-black">{totalXp} XP</div>
        </div>
        <Link to="/settings" className="text-xl" aria-label="Settings">⚙️</Link>
      </header>

      <div className="flex flex-col gap-4 px-5">
        {progress.map((p, i) => {
          const firstOfAct = i === 0 || progress[i - 1].unit.act !== p.unit.act;
          return (
            <div key={p.unit.key}>
              {firstOfAct && (
                <h2 className="mb-2 mt-4 text-xs font-black uppercase tracking-widest text-[var(--muted)]">
                  Act {p.unit.act} · {ACT_BY_TIER[p.unit.tier].name}
                </h2>
              )}
              <UnitCard progress={p} srs={srs} />
            </div>
          );
        })}
      </div>

      {due > 0 && (
        <Link
          to="/practice"
          className="fixed bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[var(--bad)] px-5 py-3 font-black text-white shadow-lg"
        >
          🔁 {due} review{due === 1 ? '' : 's'} due
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
  const lead = getPlayer(p.unit.playerIds[0]);
  const theme = teamThemeSlug(lead.team_name);
  const locked = p.status === 'locked';
  const complete = p.status === 'complete';

  const badge = complete ? '★' : locked ? '🔒' : p.unit.index + 1;
  const lessonNumber = Math.min(p.lessonsDone + 1, LESSONS_PER_UNIT);
  const showQuiz = p.quizUnlocked && !p.quizPassed;

  const inner = (
    <div
      data-team-theme={theme}
      className={`flex items-center gap-3 rounded-[var(--radius)] border-2 p-3 transition ${
        locked ? 'opacity-50' : 'active:scale-[0.99]'
      }`}
      style={{ borderColor: complete ? 'var(--team)' : 'var(--hairline)', background: 'var(--surface)' }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-black"
        style={{
          background: complete || !locked ? 'var(--team)' : 'var(--hairline)',
          color: 'var(--team-ink)',
        }}
      >
        {badge}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold">Unit {p.unit.index + 1}</div>
        <div className="truncate text-xs text-[var(--muted)]">
          {complete
            ? `Mastered ${p.mastered}/${p.unit.playerIds.length}`
            : showQuiz
              ? 'Unit quiz ready!'
              : locked
                ? `${p.unit.playerIds.length} players · locked`
                : `Lesson ${lessonNumber} of ${LESSONS_PER_UNIT} · leads with ${lead.name}`}
        </div>
      </div>
      {/* mastery pips */}
      {!locked && (
        <div className="flex gap-0.5">
          {p.unit.playerIds.slice(0, 9).map((id) => (
            <span
              key={id}
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: (srs[id]?.box ?? 0) >= 5 ? 'var(--team)' : 'var(--hairline)' }}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (locked) return inner;

  // active/complete units are playable. Quiz link when unlocked & not passed.
  const to = showQuiz
    ? `/lesson/${p.unit.key}?mode=quiz`
    : `/lesson/${p.unit.key}?attempt=${p.lessonsDone}`;
  return <Link to={to}>{inner}</Link>;
}
