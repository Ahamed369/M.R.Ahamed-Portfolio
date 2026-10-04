import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { getFlag } from '../../system/prefs';

/* ───────────────────────────── Game API contract ───────────────────────────── */

export interface GameApi {
  /** Live score shown in the Game Center header. */
  setScore: (n: number) => void;
  /** Record a result on the local leaderboard (same run → best one kept). */
  finish: (score: number, opts?: { win?: boolean; note?: string }) => void;
  /** Unlock an achievement (no-op if already unlocked). */
  achieve: (id: string) => void;
  /** Start a fresh round (remounts the game). */
  restart: () => void;
  /** True while the window is hidden, minimised, inactive or paused by the player. */
  paused: boolean;
  /** True when the Game Center window is focused (keyboard input goes to the game). */
  focused: boolean;
  dark: boolean;
  sound: boolean;
}

export interface GameProps {
  api: GameApi;
}

/* ───────────────────────────── Achievements ───────────────────────────── */

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  glyph: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-game', title: 'Player One', desc: 'Finish your first game', glyph: '🎮' },
  { id: 'first-win', title: 'First Win', desc: 'Win any game', glyph: '🏆' },
  { id: 'explorer', title: 'Explorer', desc: 'Play 5 different games', glyph: '🧭' },
  { id: 'collector', title: 'Arcade Regular', desc: 'Play 12 different games', glyph: '🕹️' },
  { id: '2048-1000', title: 'Four Digits', desc: 'Score 1,000 in 2048', glyph: '🔢' },
  { id: '2048-tile', title: 'The Big One', desc: 'Reach the 2048 tile', glyph: '💎' },
  { id: 'snake-100', title: 'Long Boi', desc: 'Score 100 in Snake', glyph: '🐍' },
  { id: 'sudoku-solve', title: 'Grid Master', desc: 'Solve a Sudoku without help', glyph: '🧩' },
  { id: 'mines-clear', title: 'Sweeper', desc: 'Clear a minefield', glyph: '💣' },
  { id: 'ttt-draw', title: 'Stalemate', desc: 'Draw against the unbeatable AI', glyph: '🤝' },
  { id: 'blocks-10', title: 'Line Clearer', desc: 'Clear 10 lines in Block Drop', glyph: '🧱' },
  { id: 'bricks-clear', title: 'Wall Breaker', desc: 'Clear a Brick Breaker level', glyph: '🧨' },
  { id: 'flappy-10', title: 'Frequent Flyer', desc: 'Pass 10 pipes in Flappy Dot', glyph: '🐤' },
  { id: 'word-2', title: 'Sharp Guess', desc: 'Guess a word in 2 tries or fewer', glyph: '🔤' },
  { id: 'quiz-15', title: 'Pattern Spotter', desc: 'Answer 15+ IQ Quiz questions right', glyph: '🧠' },
  { id: 'math-20', title: 'Human Calculator', desc: 'Solve 20 sums in Math Sprint', glyph: '➗' },
  { id: 'reaction-250', title: 'Lightning', desc: 'Average under 250 ms in Reaction', glyph: '⚡' },
  { id: 'simon-8', title: 'Elephant Memory', desc: 'Reach round 8 in Simon Says', glyph: '🐘' },
  { id: 'c4-win', title: 'Four in a Row', desc: 'Beat the Connect Four AI', glyph: '🔴' },
  { id: 'mole-25', title: 'Mole Control', desc: 'Whack 25 moles in one round', glyph: '🔨' },
  { id: 'typing-60', title: 'Keyboard Warrior', desc: 'Type 60 WPM or more', glyph: '⌨️' },
  { id: 'stack-15', title: 'Skyscraper', desc: 'Stack 15 blocks', glyph: '🏙️' },
  { id: 'pong-win', title: 'Rally King', desc: 'Win a game of Pong', glyph: '🏓' },
  { id: 'memory-fast', title: 'Photographic', desc: 'Finish Memory Match in 14 moves or fewer', glyph: '🃏' },
];

/* ───────────────────────────── Hooks ───────────────────────────── */

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

const PHYS: Record<string, string> = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd' };

/** Window-level keyboard handler, only active while the Game Center window is focused. */
export function useKeys(active: boolean, handler: (e: KeyboardEvent) => void): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!active) return;
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      // v9 — WASD by physical key position, so steering also works with Sinhala/Tamil
      // or other non-QWERTY layouts (and with Caps Lock / Shift held)
      const phys = PHYS[e.code];
      if (phys && e.key.toLowerCase() !== phys) {
        const ev = new Proxy(e, {
          get: (t, prop) => {
            if (prop === 'key') return phys;
            const v = Reflect.get(t, prop);
            return typeof v === 'function' ? v.bind(t) : v;
          },
        });
        ref.current(ev);
        return;
      }
      ref.current(e);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [active]);
}

export type Dir = 'up' | 'down' | 'left' | 'right';

export function keyDir(key: string): Dir | null {
  switch (key) {
    case 'ArrowUp': case 'w': case 'W': return 'up';
    case 'ArrowDown': case 's': case 'S': return 'down';
    case 'ArrowLeft': case 'a': case 'A': return 'left';
    case 'ArrowRight': case 'd': case 'D': return 'right';
    default: return null;
  }
}

/** Swipe detection with pointer events (works for touch, pen and mouse drags). */
export function useSwipe(ref: RefObject<HTMLElement | null>, onSwipe: (d: Dir) => void, min = 22): void {
  const cb = useRef(onSwipe);
  useEffect(() => {
    cb.current = onSwipe;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; y: number; id: number } | null = null;
    const down = (e: PointerEvent) => {
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    const up = (e: PointerEvent) => {
      if (!start || start.id !== e.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return;
      if (Math.abs(dx) > Math.abs(dy)) cb.current(dx > 0 ? 'right' : 'left');
      else cb.current(dy > 0 ? 'down' : 'up');
    };
    const cancel = () => {
      start = null;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
    };
  }, [ref, min]);
}

/** requestAnimationFrame loop that runs only while `running`; dt in seconds (clamped). */
export function useLoop(running: boolean, step: (dt: number) => void): void {
  const ref = useRef(step);
  useEffect(() => {
    ref.current = step;
  });
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ref.current(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

/** Interval that only ticks while `running`. */
export function useTicker(running: boolean, ms: number, fn: () => void): void {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => ref.current(), ms);
    return () => window.clearInterval(id);
  }, [running, ms]);
}

/**
 * A canvas that fits its wrapper while keeping a fixed world aspect ratio.
 * Draw in world units: call `begin()` to get a context already scaled.
 */
export function useFitCanvas(worldW: number, worldH: number) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [css, setCss] = useState({ w: worldW, h: worldH });
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      const s = Math.max(0.2, Math.min(r.width / worldW, r.height / worldH));
      setCss({ w: Math.floor(worldW * s), h: Math.floor(worldH * s) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [worldW, worldH]);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(css.w * dpr);
    c.height = Math.round(css.h * dpr);
  }, [css]);
  const begin = (): CanvasRenderingContext2D | null => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return null;
    ctx.setTransform(c.width / worldW, 0, 0, c.height / worldH, 0, 0);
    return ctx;
  };
  /** Convert a pointer event to world coordinates. */
  const toWorld = (clientX: number, clientY: number) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r || !r.width) return { x: 0, y: 0 };
    return { x: ((clientX - r.left) / r.width) * worldW, y: ((clientY - r.top) / r.height) * worldH };
  };
  return { wrapRef, canvasRef, css, begin, toWorld };
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/* ───────────────────────────── Sound ───────────────────────────── */

let audio: AudioContext | null = null;
export function tone(freq: number, ms = 160, type: OscillatorType = 'sine', vol = 0.12): void {
  if (!getFlag('gc-sounds', true)) return; // Settings → Game Center → Game sounds
  try {
    if (!audio) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      audio = new AC();
    }
    if (audio.state === 'suspended') void audio.resume();
    const t = audio.currentTime;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + ms / 1000 + 0.02);
  } catch {
    /* audio unavailable */
  }
}

/* ───────────────────────────── Small UI pieces ───────────────────────────── */

export function Overlay({ title, sub, children, tone: t }: { title: string; sub?: ReactNode; children?: ReactNode; tone?: 'win' | 'lose' }) {
  return (
    <div className={`gc-overlay ${t ?? ''}`} role="dialog" aria-label={title}>
      <div className="gc-overlay-card">
        <h3>{title}</h3>
        {sub && <p>{sub}</p>}
        {children && <div className="gc-overlay-actions">{children}</div>}
      </div>
    </div>
  );
}

export function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export const rand = (n: number) => Math.floor(Math.random() * n);

export function fmtSecs(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
