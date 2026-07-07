import { NavLink } from 'react-router-dom';
import { Map, Target, LayoutGrid, User, type LucideIcon } from 'lucide-react';

const TABS: { to: string; label: string; Icon: LucideIcon; end: boolean }[] = [
  { to: '/', label: 'Path', Icon: Map, end: true },
  { to: '/practice', label: 'Practice', Icon: Target, end: false },
  { to: '/roster', label: 'Roster', Icon: LayoutGrid, end: false },
  { to: '/profile', label: 'Profile', Icon: User, end: false },
];

export function TabBar() {
  return (
    <nav
      className="sticky bottom-0 z-20 flex w-full shrink-0 items-stretch justify-around border-t bg-[var(--surface)]"
      style={{ borderColor: 'var(--hairline)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2 text-xs font-bold transition ${
              isActive ? 'text-[var(--team-ink)]' : 'text-[var(--muted)]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                size={24}
                strokeWidth={isActive ? 2.6 : 2}
                className="transition-transform"
                style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)' }}
                aria-hidden
              />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
