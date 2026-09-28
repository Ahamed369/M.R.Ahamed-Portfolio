/**
 * Small, original interface sounds synthesised with the Web Audio API
 * (no audio files, no third-party sounds). Browsers only allow audio after
 * the visitor has interacted with the page, so calls before that are
 * silently ignored.
 */
type Note = { f: number; t: number; d: number; type?: OscillatorType; g?: number };

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function play(notes: Note[], volume = 0.6) {
  const a = audio();
  if (!a || volume <= 0) return;
  const master = a.createGain();
  master.gain.value = Math.min(1, volume) * 0.5;
  master.connect(a.destination);
  const t0 = a.currentTime + 0.01;
  notes.forEach(({ f, t, d, type = 'sine', g = 1 }) => {
    const o = a.createOscillator();
    const env = a.createGain();
    o.type = type;
    o.frequency.value = f;
    env.gain.setValueAtTime(0.0001, t0 + t);
    env.gain.exponentialRampToValueAtTime(0.5 * g, t0 + t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + t + d);
    o.connect(env).connect(master);
    o.start(t0 + t);
    o.stop(t0 + t + d + 0.05);
  });
}

/** Alert sounds offered in System Settings → Sound (original tones). */
export const ALERT_SOUNDS: Record<string, Note[]> = {
  Boop: [{ f: 520, t: 0, d: 0.18 }, { f: 390, t: 0.09, d: 0.22 }],
  Breeze: [{ f: 660, t: 0, d: 0.5, g: 0.6 }, { f: 880, t: 0.12, d: 0.5, g: 0.5 }],
  Bubble: [{ f: 300, t: 0, d: 0.12 }, { f: 600, t: 0.06, d: 0.14 }, { f: 900, t: 0.12, d: 0.16 }],
  Crystal: [{ f: 1320, t: 0, d: 0.6, type: 'triangle' }, { f: 1760, t: 0.08, d: 0.5, type: 'triangle', g: 0.6 }],
  Funky: [{ f: 220, t: 0, d: 0.12, type: 'square', g: 0.35 }, { f: 330, t: 0.13, d: 0.18, type: 'square', g: 0.35 }],
  Jump: [{ f: 400, t: 0, d: 0.1 }, { f: 800, t: 0.08, d: 0.2 }],
  Pebble: [{ f: 950, t: 0, d: 0.09, type: 'triangle' }],
  Sonar: [{ f: 1046, t: 0, d: 0.9, g: 0.7 }],
};

export function playAlert(name: string, volume = 0.6) {
  play(ALERT_SOUNDS[name] ?? ALERT_SOUNDS.Boop, volume);
}

/** Warm start-up chord — played when the portfolio boots (if enabled). */
export function playStartup(volume = 0.6) {
  play(
    [
      { f: 174.6, t: 0, d: 2.4, g: 0.8 },
      { f: 261.6, t: 0, d: 2.4, g: 0.7 },
      { f: 349.2, t: 0, d: 2.4, g: 0.6 },
      { f: 440, t: 0, d: 2.4, g: 0.45 },
      { f: 523.3, t: 0.02, d: 2.2, g: 0.35 },
    ],
    volume,
  );
}

/** Camera shutter click. */
export function playShutter(volume = 0.6) {
  play([{ f: 2400, t: 0, d: 0.04, type: 'square', g: 0.3 }, { f: 1200, t: 0.05, d: 0.05, type: 'square', g: 0.25 }], volume);
}

/** Soft "whoosh" for trash / UI actions. */
export function playUi(volume = 0.4) {
  play([{ f: 700, t: 0, d: 0.08, type: 'triangle', g: 0.5 }], volume);
}

/** v8 — soft two-note glass chime for notification banners. */
export function playNotification(volume = 0.5) {
  play(
    [
      { f: 1174.7, t: 0, d: 0.42, g: 0.45 },
      { f: 1568, t: 0.09, d: 0.55, g: 0.35 },
      { f: 2349, t: 0.09, d: 0.3, type: 'triangle', g: 0.08 },
    ],
    volume * 0.55,
  );
}

/** v8 — low-battery warning (descending soft tones). */
export function playLowBattery(volume = 0.5) {
  play([{ f: 880, t: 0, d: 0.25, g: 0.5 }, { f: 660, t: 0.18, d: 0.35, g: 0.45 }], volume * 0.6);
}

/** v8 — alternative start-up chimes (System Settings → Sound). */
export function playChime(style: 'classic' | 'soft' | 'bright', volume = 0.6) {
  if (style === 'soft') {
    play(
      [
        { f: 220, t: 0, d: 2.6, g: 0.6 },
        { f: 329.6, t: 0.05, d: 2.5, g: 0.5 },
        { f: 440, t: 0.1, d: 2.4, g: 0.4 },
        { f: 554.4, t: 0.15, d: 2.2, g: 0.3 },
      ],
      volume * 0.8,
    );
  } else if (style === 'bright') {
    play(
      [
        { f: 523.3, t: 0, d: 1.8, g: 0.6 },
        { f: 659.3, t: 0.08, d: 1.7, g: 0.5 },
        { f: 784, t: 0.16, d: 1.6, g: 0.45 },
        { f: 1046.5, t: 0.24, d: 1.5, g: 0.35, type: 'triangle' },
      ],
      volume,
    );
  } else playStartup(volume);
}
