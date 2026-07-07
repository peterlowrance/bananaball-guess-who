import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Path', icon: '🗺️', end: true },
  { to: '/practice', label: 'Practice', icon: '🎯', end: false },
  { to: '/roster', label: 'Roster', icon: '🃏', end: false },
  { to: '/profile', label: 'Profile', icon: '🍌', end: false },
];

export function TabBar() {
  return (
    <nav
      className="sticky bottom-0 z-20 flex w-full shrink-0 items-stretch justify-around border-t bg-[var(--surface)]"
      style={{ borderColor: 'var(--hairline)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-bold transition ${
              isActive ? 'text-[var(--team-ink)]' : 'text-[var(--muted)]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className="text-2xl transition-transform"
                style={{ transform: isActive ? 'scale(1.15)' : 'scale(1)' }}
              >
                {t.icon}
              </span>
              {t.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
