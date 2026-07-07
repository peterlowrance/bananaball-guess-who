// Web Audio sound manager. Effects are synthesized (no bundled files) so they
// are zero-byte and fully offline. AudioContext is created lazily and unlocked
// on the first user gesture (iOS requirement).

export type SoundName =
  | 'correct'
  | 'wrong'
  | 'complete'
  | 'perfect'
  | 'combo'
  | 'levelup'
  | 'tap';

let ctx: AudioContext | null = null;
let unlocked = false;
let comboStep = 0;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Call on the first user gesture so audio can play on iOS. */
export function unlockAudio(): void {
  const c = ac();
  if (c && c.state === 'suspended') void c.resume();
  unlocked = true;
}

/** A single enveloped oscillator tone. */
function tone(
  c: AudioContext,
  {
    freq,
    start,
    dur,
    type = 'sine',
    gain = 0.2,
    slideTo,
  }: { freq: number; start: number; dur: number; type?: OscillatorType; gain?: number; slideTo?: number },
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  // quick attack, exponential decay — bell/marimba-ish
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

const NOTES = { C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, A4: 440, E4: 329.63, G3: 196 };

export function playSound(name: SoundName): void {
  const c = ac();
  if (!c || !unlocked) return;
  // resume if the tab was backgrounded
  if (c.state === 'suspended') void c.resume();
  const t = c.currentTime;

  switch (name) {
    case 'correct':
      // rising two-note marimba ding
      tone(c, { freq: NOTES.E5, start: t, dur: 0.14, type: 'triangle', gain: 0.25 });
      tone(c, { freq: NOTES.G5, start: t + 0.08, dur: 0.18, type: 'triangle', gain: 0.25 });
      comboStep = 0;
      break;
    case 'wrong':
      // soft low descending "dunk" — never harsh
      tone(c, { freq: 220, start: t, dur: 0.18, type: 'sine', gain: 0.18, slideTo: 150 });
      comboStep = 0;
      break;
    case 'combo': {
      // each combo tier steps up in pitch
      comboStep = Math.min(comboStep + 1, 8);
      const base = NOTES.C5 * Math.pow(2, comboStep / 12);
      tone(c, { freq: base, start: t, dur: 0.12, type: 'square', gain: 0.15 });
      tone(c, { freq: base * 1.5, start: t + 0.05, dur: 0.14, type: 'triangle', gain: 0.15 });
      break;
    }
    case 'complete':
      // ascending arpeggio fanfare
      [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((f, i) =>
        tone(c, { freq: f, start: t + i * 0.1, dur: 0.3, type: 'triangle', gain: 0.22 }),
      );
      break;
    case 'perfect':
      [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6, NOTES.E5 * 2].forEach((f, i) =>
        tone(c, { freq: f, start: t + i * 0.09, dur: 0.32, type: 'triangle', gain: 0.22 }),
      );
      // sparkle
      tone(c, { freq: NOTES.C6 * 2, start: t + 0.5, dur: 0.4, type: 'sine', gain: 0.12 });
      break;
    case 'levelup':
      tone(c, { freq: NOTES.G3, start: t, dur: 0.5, type: 'sawtooth', gain: 0.12 });
      [NOTES.C5, NOTES.G5, NOTES.C6].forEach((f, i) =>
        tone(c, { freq: f, start: t + 0.1 + i * 0.12, dur: 0.35, type: 'triangle', gain: 0.2 }),
      );
      break;
    case 'tap':
      tone(c, { freq: NOTES.A4, start: t, dur: 0.05, type: 'sine', gain: 0.1 });
      break;
  }
}
