import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { TabBar } from './TabBar';
import { useStore } from '../../store';

/** App frame: applies dark mode, centers a phone-width column, hosts the tab bar. */
export function Layout() {
  const dark = useStore((s) => s.profile.settings.dark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div
      className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
