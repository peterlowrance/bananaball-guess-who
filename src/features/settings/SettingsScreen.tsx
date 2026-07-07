import { useState } from 'react';
import { useStore } from '../../store';
import { teams } from '../../data/dataset';
import { teamThemeSlug } from '../../lib/theme';
import { TeamLogo } from '../shared/TeamLogo';
import type { Goal } from '../../engine/gamification/streak';

const GOALS: { id: Goal; label: string; xp: number }[] = [
  { id: 'casual', label: 'Casual', xp: 20 },
  { id: 'regular', label: 'Regular', xp: 40 },
  { id: 'fanatic', label: 'Fanatic', xp: 60 },
];

export function SettingsScreen() {
  const settings = useStore((s) => s.profile.settings);
  const goal = useStore((s) => s.profile.streak.goal);
  const setSettings = useStore((s) => s.setSettings);
  const setGoal = useStore((s) => s.setGoal);
  const resetProgress = useStore((s) => s.resetProgress);
  const exportState = useStore((s) => s.exportState);
  const importState = useStore((s) => s.importState);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');

  const toggleFocus = (teamName: string) => {
    const set = new Set(settings.focusTeams);
    if (set.has(teamName)) set.delete(teamName);
    else set.add(teamName);
    setSettings({ focusTeams: [...set] });
  };

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      <h1 className="text-2xl font-black">Settings</h1>

      <Section title="Daily goal">
        <div className="flex gap-2">
          {GOALS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGoal(g.id)}
              className={`flex-1 rounded-2xl border-2 p-3 text-center font-bold transition ${
                goal === g.id ? 'border-[var(--team)] bg-[var(--team-soft)]' : 'border-[var(--hairline)]'
              }`}
            >
              <div>{g.label}</div>
              <div className="text-xs text-[var(--muted)]">{g.xp} XP</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Focus teams" subtitle="Learn only selected teams. None = all teams.">
        <div className="grid grid-cols-2 gap-2">
          {teams.map((t) => {
            const on = settings.focusTeams.includes(t.name);
            return (
              <button
                key={t.team_id}
                data-team-theme={teamThemeSlug(t.name)}
                onClick={() => toggleFocus(t.name)}
                className={`flex items-center gap-2 rounded-2xl border-2 p-2 text-left text-sm font-bold transition ${
                  on ? 'border-[var(--team)] bg-[var(--team-soft)]' : 'border-[var(--hairline)]'
                }`}
              >
                <TeamLogo teamName={t.name} size={28} />
                <span className="leading-tight">{t.name}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Preferences">
        <Toggle label="Sound effects" value={settings.sound} onChange={(v) => setSettings({ sound: v })} />
        <Toggle label="Haptics" value={settings.haptics} onChange={(v) => setSettings({ haptics: v })} />
        <Toggle
          label="Hard mode (type names)"
          value={settings.hardMode}
          onChange={(v) => setSettings({ hardMode: v })}
        />
        <Toggle label="Reduce motion" value={settings.reducedMotion} onChange={(v) => setSettings({ reducedMotion: v })} />
        <Toggle label="Dark mode" value={settings.dark} onChange={(v) => setSettings({ dark: v })} />
      </Section>

      <Section title="Backup" subtitle="Copy your progress or paste a saved backup.">
        <button
          className="w-full rounded-2xl bg-[var(--team-soft)] p-3 font-bold"
          onClick={async () => {
            const blob = exportState();
            try {
              await navigator.clipboard.writeText(blob);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              setImportText(blob);
            }
          }}
        >
          {copied ? 'Copied! ✓' : 'Export progress'}
        </button>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste backup JSON here…"
          className="mt-2 h-20 w-full rounded-2xl border-2 border-[var(--hairline)] bg-transparent p-2 text-xs"
        />
        <button
          className="mt-2 w-full rounded-2xl border-2 border-[var(--hairline)] p-3 font-bold disabled:opacity-40"
          disabled={!importText.trim()}
          onClick={() => {
            if (importState(importText.trim())) {
              setImportText('');
              alert('Progress restored!');
            } else {
              alert('That backup could not be read.');
            }
          }}
        >
          Import progress
        </button>
      </Section>

      <Section title="Danger zone">
        <button
          className="w-full rounded-2xl border-2 border-[var(--bad)] p-3 font-bold text-[var(--bad)]"
          onClick={() => {
            if (confirm('Erase ALL progress? This cannot be undone.') && confirm('Really erase everything?')) {
              resetProgress();
            }
          }}
        >
          Reset all progress
        </button>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="font-black">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--muted)]">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="font-semibold">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 rounded-full transition ${value ? 'bg-[var(--ok)]' : 'bg-[var(--hairline)]'}`}
        aria-pressed={value}
      >
        <span
          className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
          style={{ transform: value ? 'translateX(1.35rem)' : 'translateX(0.1rem)' }}
        />
      </button>
    </label>
  );
}
