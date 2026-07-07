import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { TabBar } from './TabBar';
import { useStore } from '../../store';

/**
 * App frame. Mobile-first: on phones the app is full-bleed and fills the
 * viewport. On larger screens the content sits in a centered, comfortably-wide
 * column framed against a tinted page backdrop so desktop looks intentional
 * rather than a stranded strip.
 */
export function Layout() {
  const dark = useStore((s) => s.profile.settings.dark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div className="app-backdrop flex min-h-[100dvh] justify-center">
      <div
        className="app-frame flex min-h-[100dvh] w-full flex-col sm:min-h-0 sm:my-4 sm:h-[calc(100dvh-2rem)] sm:max-w-[560px] sm:overflow-hidden sm:rounded-[2rem] sm:shadow-xl"
        style={{ background: 'var(--bg)', color: 'var(--text)' }}
      >
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <TabBar />
      </div>
    </div>
  );
}
