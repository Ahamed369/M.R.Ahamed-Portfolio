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

let mutedAll = false;
/** v10 — the system Mute (Control Centre / Sound) silences every interface sound */
export function setSoundMuted(m: boolean) {
  mutedAll = m;
}

function play(notes: Note[], volume = 0.6) {
  if (mutedAll) return;
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

/** v8 — soft two-note glass chime (kept as the "Glass Chime" tone). */
function glassChime(volume: number) {
  play(
    [
      { f: 1174.7, t: 0, d: 0.42, g: 0.45 },
      { f: 1568, t: 0.09, d: 0.55, g: 0.35 },
      { f: 2349, t: 0.09, d: 0.3, type: 'triangle', g: 0.08 },
    ],
    volume * 0.55,
  );
}

/* ───────────── v10 — notification tones, ringtones and the visitor's own sound ───────────── */

/** Original notification tones (synthesised — no recordings, no third-party sounds). */
export const NOTIF_TONES: Record<string, Note[]> = {
  /** the portfolio's own bright two-step ding */
  'Portfolio Ding': [
    { f: 1318.5, t: 0, d: 0.32, type: 'triangle', g: 0.55 },
    { f: 1975.5, t: 0.11, d: 0.62, g: 0.5 },
    { f: 3951, t: 0.11, d: 0.22, g: 0.05 },
  ],
  Droplet: [{ f: 1500, t: 0, d: 0.1, g: 0.6 }, { f: 2100, t: 0.05, d: 0.18, g: 0.4 }],
  Glint: [{ f: 2093, t: 0, d: 0.35, type: 'triangle', g: 0.4 }, { f: 2637, t: 0.07, d: 0.4, type: 'triangle', g: 0.3 }],
  Petal: [{ f: 784, t: 0, d: 0.25, g: 0.5 }, { f: 988, t: 0.1, d: 0.25, g: 0.45 }, { f: 1175, t: 0.2, d: 0.4, g: 0.4 }],
  Pulse: [{ f: 880, t: 0, d: 0.08, g: 0.6 }, { f: 880, t: 0.14, d: 0.08, g: 0.6 }],
};

/** Original ringtones — short melodies that loop while ringing. */
export const RINGTONES: Record<string, { notes: Note[]; len: number }> = {
  Daybreak: {
    len: 1.9,
    notes: [523.3, 659.3, 784, 1046.5, 784, 659.3].map((f, i) => ({ f, t: i * 0.16, d: 0.3, type: 'triangle' as OscillatorType, g: 0.55 })),
  },
  Lagoon: {
    len: 2.2,
    notes: [440, 554.4, 659.3, 554.4, 740, 659.3].map((f, i) => ({ f, t: i * 0.22, d: 0.42, g: 0.5 })),
  },
  Monsoon: {
    len: 1.6,
    notes: [392, 392, 523.3, 466.2, 392, 349.2].map((f, i) => ({ f, t: i * 0.13, d: 0.18, type: 'square' as OscillatorType, g: 0.22 })),
  },
  Lantern: {
    len: 2.4,
    notes: [587.3, 880, 784, 659.3, 587.3, 440].map((f, i) => ({ f, t: i * 0.24, d: 0.5, g: 0.45 })),
  },
  Kite: {
    len: 1.4,
    notes: [987.8, 1318.5, 987.8, 1318.5, 1568].map((f, i) => ({ f, t: i * 0.11, d: 0.16, type: 'triangle' as OscillatorType, g: 0.5 })),
  },
  'Soft Bells': {
    len: 2.6,
    notes: [1046.5, 1318.5, 1568, 2093].map((f, i) => ({ f, t: i * 0.3, d: 1.1, g: 0.35 })),
  },
};

export const CUSTOM_TONE = 'Your Sound';
let customUrl: string | null = null;
let customName = '';
/** set by Settings when the visitor uploads their own file (kept only in this browser) */
export function setCustomSound(url: string | null, name = '') {
  customUrl = url;
  customName = name;
}
export const customSoundName = () => (customUrl ? customName || 'Uploaded sound' : '');

let notifTone = 'Portfolio Ding';
let ringtone = 'Daybreak';
export function setToneChoice(n: string, r: string) {
  notifTone = n;
  ringtone = r;
}

function playFile(url: string, volume: number, loop = false): HTMLAudioElement | null {
  if (mutedAll) return null;
  try {
    const a = new Audio(url);
    a.volume = Math.min(1, Math.max(0, volume));
    a.loop = loop;
    void a.play().catch(() => undefined);
    return a;
  } catch {
    return null;
  }
}

export function playTone(name: string, volume = 0.5) {
  if (name === CUSTOM_TONE && customUrl) return void playFile(customUrl, volume);
  if (name === 'Glass Chime') return glassChime(volume);
  if (NOTIF_TONES[name]) return play(NOTIF_TONES[name], volume * 0.6);
  if (ALERT_SOUNDS[name]) return play(ALERT_SOUNDS[name], volume);
  play(NOTIF_TONES['Portfolio Ding'], volume * 0.6);
}

/** Notification banner sound — uses the tone chosen in Settings → Sounds. */
export function playNotification(volume = 0.5) {
  playTone(notifTone, volume);
}

/** Ring until stop() is called (calls, alarms, timers). */
let current: { stop: () => void } | null = null;
export function ring(name = ringtone, volume = 0.6, maxMs = 60000): { stop: () => void } {
  current?.stop();
  let stopFn: () => void;
  if (name === CUSTOM_TONE && customUrl) {
    const a = playFile(customUrl, volume, true);
    stopFn = () => a?.pause();
  } else {
    const r = RINGTONES[name] ?? RINGTONES.Daybreak;
    play(r.notes, volume);
    const iv = window.setInterval(() => play(r.notes, volume), r.len * 1000 + 350);
    stopFn = () => window.clearInterval(iv);
  }
  const t = window.setTimeout(() => h.stop(), maxMs);
  const h = {
    stop: () => {
      window.clearTimeout(t);
      stopFn();
      if (current === h) current = null;
    },
  };
  current = h;
  return h;
}
/** stop whatever is ringing (alarm, timer, incoming call) */
export function stopRinging() {
  current?.stop();
}

/** Preview a ringtone once. */
export function previewRingtone(name: string, volume = 0.6) {
  if (name === CUSTOM_TONE && customUrl) {
    const a = playFile(customUrl, volume);
    window.setTimeout(() => a?.pause(), 4000);
    return;
  }
  play((RINGTONES[name] ?? RINGTONES.Daybreak).notes, volume);
}

/** Keyboard click / lock click for iOS. */
export function playTick(volume = 0.25) {
  play([{ f: 3200, t: 0, d: 0.015, type: 'square', g: 0.2 }], volume);
}
export function playLock(volume = 0.4) {
  play([{ f: 180, t: 0, d: 0.06, type: 'square', g: 0.4 }, { f: 120, t: 0.03, d: 0.05, type: 'square', g: 0.3 }], volume);
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
