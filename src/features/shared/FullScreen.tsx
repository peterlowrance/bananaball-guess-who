// Frame for full-screen routes (lesson, practice, player card, onboarding) that
// run outside the tab Layout. Same responsive treatment: full-bleed on mobile,
// centered framed column on desktop.
export function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-backdrop flex min-h-[100dvh] justify-center">
      <div
        className="flex min-h-[100dvh] w-full flex-col sm:my-4 sm:min-h-0 sm:h-[calc(100dvh-2rem)] sm:max-w-[560px] sm:overflow-hidden sm:rounded-[2rem] sm:shadow-xl"
        style={{ background: 'var(--bg)', color: 'var(--text)' }}
      >
        {children}
      </div>
    </div>
  );
}
