import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useStore } from '../../store';
import type { Goal } from '../../engine/gamification/streak';

const GOALS: { id: Goal; label: string; xp: number }[] = [
  { id: 'casual', label: 'Casual', xp: 20 },
  { id: 'regular', label: 'Regular', xp: 40 },
  { id: 'fanatic', label: 'Fanatic', xp: 60 },
];

/** Settings sections, composed at the bottom of the Profile tab. */
export function SettingsPanel() {
  const settings = useStore((s) => s.profile.settings);
  const goal = useStore((s) => s.profile.streak.goal);
  const setSettings = useStore((s) => s.setSettings);
  const setGoal = useStore((s) => s.setGoal);
  const resetProgress = useStore((s) => s.resetProgress);
  const exportState = useStore((s) => s.exportState);
  const importState = useStore((s) => s.importState);
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const downloadBackup = () => {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bananaball-guess-who-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Backup downloaded');
    setTimeout(() => setStatus(null), 2500);
  };

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    const text = await file.text();
    if (importState(text)) setStatus('Progress restored');
    else setStatus('That file could not be read.');
    setTimeout(() => setStatus(null), 2500);
  };

  return (
    <div className="flex flex-col gap-6 border-t-2 border-[var(--hairline)] pt-6">
      <h2 className="text-xl font-black">Settings</h2>

      <Section title="Daily goal">
        <div className="flex gap-2">
          {GOALS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGoal(g.id)}
              className={`flex-1 rounded-2xl border-2 p-3 text-center font-bold transition active:scale-[0.97] ${
                goal === g.id ? 'border-[var(--team)] bg-[var(--team-soft)]' : 'border-[var(--hairline)]'
              }`}
            >
              <div>{g.label}</div>
              <div className="text-xs text-[var(--muted)]">{g.xp} XP</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Preferences">
        <Toggle label="Sound effects" value={settings.sound} onChange={(v) => setSettings({ sound: v })} />
        <Toggle label="Haptics" value={settings.haptics} onChange={(v) => setSettings({ haptics: v })} />
        <Toggle label="Dark mode" value={settings.dark} onChange={(v) => setSettings({ dark: v })} />
      </Section>

      <Section title="Backup" subtitle="Save your progress to a file, or restore from one.">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--team-soft)] p-3.5 font-bold transition active:scale-[0.99]"
          onClick={downloadBackup}
        >
          <Download size={18} aria-hidden /> Download backup
        </button>
        <button
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[var(--hairline)] p-3.5 font-bold transition active:scale-[0.99]"
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={18} aria-hidden /> Restore from file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFilePicked}
        />
        {status && <p className="mt-2 text-center text-sm font-bold text-[var(--muted)]">{status}</p>}
      </Section>

      <Section title="Danger zone">
        <button
          className="w-full rounded-2xl border-2 border-[var(--bad)] p-3 font-bold text-[var(--bad)] transition active:scale-[0.99]"
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
  // Track 56x32, knob 28 inset 2px → slides exactly 24px (56-28-2-2).
  return (
    <label className="flex cursor-pointer items-center justify-between py-2.5">
      <span className="font-semibold">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 ${
          value ? 'bg-[var(--ok)]' : 'bg-[var(--hairline)]'
        }`}
      >
        <span
          className="absolute left-0.5 top-0.5 h-7 w-7 rounded-full bg-white shadow-md transition-transform duration-200"
          style={{ transform: value ? 'translateX(24px)' : 'translateX(0)' }}
        />
      </button>
    </label>
  );
}
