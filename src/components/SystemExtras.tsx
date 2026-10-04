/**
 * v8 — system extras mounted once by the Desktop:
 *  • Hot Corners (System Settings → Desktop & Dock → Hot Corners…)
 *  • Stage Manager strip
 *  • App Switcher (Alt/Ctrl + Tab or `) and window keyboard shortcuts
 *  • Keyboard-shortcuts sheet (Ctrl + / or F1)
 *  • Seasonal decorations
 *  • Low-battery warnings (Battery Status API, with a Settings test button)
 *  • Share links (#/app/<id>?…) and badge clearing
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { WallImage } from './Wallpaper';
import { AppIcon } from './AppIcons';
import { APPS } from '../system/apps';
import { MENUBAR_H, dockReserve, dockSideReserve, maximizedRect, useWM } from '../system/WindowManager';
import { useSystem } from '../system/SystemContext';
import { useSettings } from '../system/SettingsContext';
import { notify } from '../system/notify';
import { playLowBattery } from '../system/sounds';
import { parseDeepLink } from '../system/share';
import { CLEAR_ON_OPEN, clearBadge } from '../system/badges';
import type { AppId, HotCornerAction, Rect } from '../system/types';
import { wallpaperById } from '../data/media';
import { personal } from '../data/portfolio';
import { useMusic } from '../system/MusicContext';
import { getChoice } from '../system/prefs';

/* ───────────────────────── tiling helpers (shared with Window.tsx) ───────────────────────── */
export type TileZone = 'left' | 'right' | 'max' | 'tl' | 'tr' | 'bl' | 'br' | 'center';
export function tileRect(z: TileZone): Rect {
  const sr = dockSideReserve();
  const X0 = sr.left;
  const W = window.innerWidth - sr.left - sr.right;
  const top = MENUBAR_H;
  const H = window.innerHeight - MENUBAR_H - dockReserve() + 4;
  const g = 6;
  const hw = Math.round(W / 2);
  const r = tileRectIn(z, W, H, top, g, hw);
  return { ...r, x: r.x + X0 };
}
function tileRectIn(z: TileZone, W: number, H: number, top: number, g: number, hw: number): Rect {
  const hh = Math.round(H / 2);
  switch (z) {
    case 'left':
      return { x: g, y: top + g, w: hw - g * 1.5, h: H - g * 2 };
    case 'right':
      return { x: hw + g / 2, y: top + g, w: hw - g * 1.5, h: H - g * 2 };
    case 'tl':
      return { x: g, y: top + g, w: hw - g * 1.5, h: hh - g * 1.5 };
    case 'tr':
      return { x: hw + g / 2, y: top + g, w: hw - g * 1.5, h: hh - g * 1.5 };
    case 'bl':
      return { x: g, y: top + hh + g / 2, w: hw - g * 1.5, h: hh - g * 1.5 };
    case 'br':
      return { x: hw + g / 2, y: top + hh + g / 2, w: hw - g * 1.5, h: hh - g * 1.5 };
    case 'center': {
      const w = Math.min(W - 80, 980);
      const h = Math.min(H - 40, 640);
      return { x: Math.round((W - w) / 2), y: Math.round(top + (H - h) / 2), w, h };
    }
    default: {
      const m = maximizedRect();
      return { ...m, x: m.x - dockSideReserve().left };
    }
  }
}

function focusedVisible(wm: ReturnType<typeof useWM>) {
  return wm.windows.find((w) => w.id === wm.focusedId && w.phase !== 'minimized');
}

/* ───────────────────────── Hot corners ───────────────────────── */
function useHotCorners(run: (a: HotCornerAction) => void) {
  const { settings } = useSettings();
  const sys = useSystem();
  const armed = useRef<number | null>(null);
  const fired = useRef<number | null>(null);
  const timer = useRef(0);
  useEffect(() => {
    const corners = settings.hotCorners ?? [];
    if (!corners.some((c) => c && c !== 'none')) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || sys.phase !== 'ready' || sys.locked || document.body.classList.contains('is-dragging')) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const m = 3;
      const i = e.clientX <= m && e.clientY <= m ? 0 : e.clientX >= W - m && e.clientY <= m ? 1 : e.clientX <= m && e.clientY >= H - m ? 2 : e.clientX >= W - m && e.clientY >= H - m ? 3 : -1;
      if (i === -1) {
        armed.current = null;
        fired.current = null;
        window.clearTimeout(timer.current);
        return;
      }
      if (armed.current === i || fired.current === i) return;
      armed.current = i;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const a = corners[i];
        if (a && a !== 'none' && armed.current === i) {
          fired.current = i;
          run(a);
        }
      }, 260);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.clearTimeout(timer.current);
    };
  }, [settings.hotCorners, sys.phase, sys.locked, run]);
}

/* ───────────────────────── Battery ───────────────────────── */
interface BatteryLike {
  level: number;
  charging: boolean;
  addEventListener: (t: string, f: () => void) => void;
  removeEventListener: (t: string, f: () => void) => void;
}
function lowBatteryAlert(pct: number, simulated = false) {
  playLowBattery(0.6);
  document.documentElement.classList.add('batt-low');
  window.setTimeout(() => document.documentElement.classList.remove('batt-low'), 4000);
  notify({
    app: 'Battery',
    icon: 'settings',
    key: 'lowbatt',
    critical: pct <= 10,
    label: simulated ? 'Low Battery (test)' : 'Low Battery',
    title: `Your device is on ${pct}% battery`,
    body: simulated ? 'This is a test of the low-battery warning.' : 'Plug in soon — the portfolio will keep your windows open.',
  });
}
function useBatteryWarnings() {
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
    const test = () => lowBatteryAlert(10, true);
    window.addEventListener('mra-lowbattery-test', test);
    let bat: BatteryLike | null = null;
    const warned = new Set<number>();
    const check = () => {
      if (!bat || bat.charging) {
        warned.clear();
        return;
      }
      const pct = Math.round(bat.level * 100);
      for (const th of [20, 10, 5]) {
        if (pct <= th && !warned.has(th)) {
          warned.add(th);
          lowBatteryAlert(pct);
          break;
        }
      }
    };
    nav.getBattery?.()
      .then((b) => {
        bat = b;
        b.addEventListener('levelchange', check);
        b.addEventListener('chargingchange', check);
        check();
      })
      .catch(() => undefined);
    return () => {
      window.removeEventListener('mra-lowbattery-test', test);
      bat?.removeEventListener('levelchange', check);
      bat?.removeEventListener('chargingchange', check);
    };
  }, []);
}

/* ───────────────────────── Seasons ───────────────────────── */
type Season = { id: string; name: string; kind: 'snow' | 'lanterns' | 'lamps' | 'confetti' | 'flowers' | 'moons' };
const SEASON_DATES: { from: string; to: string; s: Season }[] = [
  { from: '12-15', to: '12-30', s: { id: 'xmas', name: 'Christmas', kind: 'snow' } },
  { from: '12-31', to: '12-31', s: { id: 'ny', name: 'New Year', kind: 'confetti' } },
  { from: '01-01', to: '01-02', s: { id: 'ny', name: 'New Year', kind: 'confetti' } },
  { from: '04-12', to: '04-16', s: { id: 'avurudu', name: 'Sinhala & Tamil New Year', kind: 'flowers' } },
  { from: '2026-05-01', to: '2026-05-03', s: { id: 'vesak', name: 'Vesak', kind: 'lanterns' } },
  { from: '2027-05-20', to: '2027-05-22', s: { id: 'vesak', name: 'Vesak', kind: 'lanterns' } },
  { from: '2026-11-07', to: '2026-11-09', s: { id: 'deepavali', name: 'Deepavali', kind: 'lamps' } },
  { from: '2027-10-28', to: '2027-10-30', s: { id: 'deepavali', name: 'Deepavali', kind: 'lamps' } },
  { from: '2027-03-09', to: '2027-03-11', s: { id: 'eid', name: 'Eid al-Fitr', kind: 'moons' } },
  { from: '2027-05-16', to: '2027-05-18', s: { id: 'eid', name: 'Eid al-Adha', kind: 'moons' } },
];
export function currentSeason(d = new Date()): Season | null {
  const pad = (n: number) => String(n).padStart(2, '0');
  const md = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const ymd = `${d.getFullYear()}-${md}`;
  for (const x of SEASON_DATES) {
    if (x.from.length === 5 ? md >= x.from && md <= x.to : ymd >= x.from && ymd <= x.to) return x.s;
  }
  try {
    const forced = sessionStorage.getItem('mra-season-preview');
    if (forced) return SEASON_DATES.find((x) => x.s.id === forced)?.s ?? null;
  } catch {
    /* ignore */
  }
  return null;
}

function SeasonLayer() {
  const { settings, motionReduced } = useSettings();
  const [, bump] = useState(0);
  useEffect(() => {
    const on = () => bump((x) => x + 1);
    window.addEventListener('mra-season-change', on);
    return () => window.removeEventListener('mra-season-change', on);
  }, []);
  const season = settings.seasonal ? currentSeason() : null;
  const items = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ i, left: (i * 37) % 100, delay: -((i * 1.7) % 12), dur: 9 + ((i * 13) % 9), size: 10 + ((i * 7) % 12) })), []);
  if (!season) return null;
  const glyph = { snow: '❄', confetti: '✦', flowers: '🌸', lanterns: '🏮', lamps: '🪔', moons: '🌙' }[season.kind];
  if (season.kind === 'lanterns' || season.kind === 'lamps' || season.kind === 'moons') {
    return (
      <div className="season-layer" aria-hidden="true">
        {[8, 22, 78, 92].map((x, i) => (
          <span key={x} className="season-lantern" style={{ left: `${x}%`, animationDelay: `${-i * 0.9}s` }}>
            {glyph}
          </span>
        ))}
      </div>
    );
  }
  if (motionReduced) return null;
  return (
    <div className="season-layer" aria-hidden="true">
      {items.map((f) => (
        <span key={f.i} className="season-flake" style={{ left: `${f.left}%`, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s`, fontSize: f.size, color: season.kind === 'confetti' ? `hsl(${f.i * 47} 90% 65%)` : undefined }}>
          {glyph}
        </span>
      ))}
    </div>
  );
}

/* ───────────────────────── Shortcuts sheet ───────────────────────── */
export const SHORTCUTS: [string, string][] = [
  ['Spotlight search', 'Ctrl/⌘ + Space  ·  Ctrl/⌘ + K'],
  ['Launchpad', 'F4'],
  ['Mission Control', 'F3  ·  Ctrl + ↑'],
  ['App Switcher', 'Alt + Tab  ·  Ctrl + `'],
  ['Minimize window', 'Alt + M'],
  ['Close window', 'Alt + W'],
  ['Tile left / right', 'Ctrl + Alt + ← / →'],
  ['Fill screen', 'Ctrl + Alt + ↑'],
  ['Centre window', 'Ctrl + Alt + ↓'],
  ['Show desktop (minimize all)', 'Ctrl + Alt + D'],
  ['Stage Manager', 'Ctrl + Alt + S'],
  ['Notification Center', 'Ctrl + Alt + N'],
  ['Control Center', 'Ctrl + Alt + C'],
  ['Hire Me', 'Ctrl + Alt + H'],
  ['Share portfolio', 'Ctrl + Alt + P'],
  ['Lock screen', 'Ctrl + ⌘ + Q  ·  Ctrl + Alt + L'],
  ['Keyboard shortcuts (this sheet)', 'Ctrl + /  ·  F1'],
  ['Quick Look a desktop file', 'Space'],
  ['Close menus, sheets & overlays', 'Esc'],
];

function ShortcutsSheet({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="kb-sheet-back" onPointerDown={(e) => e.target === e.currentTarget && onClose()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="kb-sheet" role="dialog" aria-modal="true" aria-labelledby="kb-h">
        <h2 id="kb-h">⌨️ Keyboard Shortcuts</h2>
        <p>On a Mac use ⌥ Option for Alt. Browser-reserved keys (like ⌘W / Ctrl+W) are left to your browser.</p>
        <div className="kb-grid">
          {SHORTCUTS.map(([a, k]) => (
            <div key={a} className="kb-row">
              <span>{a}</span>
              <kbd>{k}</kbd>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'right', marginTop: 14 }}>
          <button ref={ref} type="button" className="hm-btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Screen saver ───────────────────────── */
function ScreenSaver() {
  const { settings } = useSettings();
  const sys = useSystem();
  const [on, setOn] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const start = () => setOn(true);
    window.addEventListener('mra-screensaver', start);
    return () => window.removeEventListener('mra-screensaver', start);
  }, []);
  // idle start (System Settings → Screen Saver → Start after)
  useEffect(() => {
    let last = Date.now();
    const bump = () => (last = Date.now());
    const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = window.setInterval(() => {
      const mins = Number(readSaverAfter());
      if (!mins || sys.phase !== 'ready' || sys.locked || sys.asleep) return;
      if (Date.now() - last > mins * 60000) setOn(true);
    }, 10000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(t);
    };
  }, [sys.phase, sys.locked, sys.asleep]);
  useEffect(() => {
    if (!on) return;
    const stop = () => setOn(false);
    const arm = window.setTimeout(() => {
      window.addEventListener('pointermove', stop, { once: true });
      window.addEventListener('keydown', stop, { once: true });
      window.addEventListener('pointerdown', stop, { once: true });
    }, 700);
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(arm);
      window.clearInterval(t);
      window.removeEventListener('pointermove', stop);
      window.removeEventListener('keydown', stop);
      window.removeEventListener('pointerdown', stop);
    };
  }, [on]);
  if (!on) return null;
  const wp = wallpaperById(settings.wallpaper);
  // v10.3 — Settings → Screen Saver → Style really changes the screen saver
  const style = getChoice('saver', 'wallpaper');
  const img = style === 'aurora' ? 'live-aurora' : style === 'sunrise' ? 'grad-sunrise' : style === 'space' ? 'live-space' : wp.id;
  return (
    <div className={`saver8 saver-${style}`} role="status" aria-label="Screen saver — move the mouse or press a key to return">
      {style !== 'mono' && (
        <div className="saver8-img">
          <WallImage id={img} live />
        </div>
      )}
      <div className="saver8-shade" />
      <div className="saver8-clock">
        <b>{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '')}</b>
        <span>{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <small>{personal.name} · {personal.shortTitle}</small>
      </div>
    </div>
  );
}
function readSaverAfter(): string {
  try {
    const raw = localStorage.getItem('mra-settings-app-v5');
    const v = raw ? (JSON.parse(raw) as { choices?: Record<string, string> }).choices?.['saver-after'] : undefined;
    return v ?? '0';
  } catch {
    return '0';
  }
}

/* ───────────────────────── The component ───────────────────────── */
export function SystemExtras() {
  const wm = useWM();
  const sys = useSystem();
  const { settings, update } = useSettings();
  const [switcher, setSwitcher] = useState<{ list: AppId[]; i: number } | null>(null);
  const [kb, setKb] = useState(false);
  const swRef = useRef(switcher);
  swRef.current = switcher;
  const wmRef = useRef(wm);
  wmRef.current = wm;

  const tile = (z: TileZone) => {
    const w = focusedVisible(wmRef.current);
    if (!w || window.innerWidth < 700) return;
    const el = document.querySelector<HTMLElement>(`[data-win-id="${w.id}"]`);
    el?.classList.add('snapping');
    window.setTimeout(() => el?.classList.remove('snapping'), 380);
    if (z === 'max') {
      if (!w.maximized) wmRef.current.toggleMaximize(w.id);
      return;
    }
    wmRef.current.setRect(w.id, tileRect(z));
  };

  const showDesktop = () => {
    const vis = wmRef.current.windows.filter((w) => w.phase !== 'minimized' && w.phase !== 'minimizing');
    vis.forEach((w, i) => window.setTimeout(() => wmRef.current.minimize(w.id), i * 70));
  };

  const runCorner = useMemo(
    () => (a: HotCornerAction) => {
      switch (a) {
        case 'mc':
          sys.toggleOverlay('missioncontrol');
          break;
        case 'launchpad':
          sys.toggleOverlay('launchpad');
          break;
        case 'nc':
          sys.toggleOverlay('notifications');
          break;
        case 'cc':
          sys.toggleOverlay('control');
          break;
        case 'desktop':
          showDesktop();
          break;
        case 'lock':
          sys.lock();
          break;
        case 'sleep':
          sys.sleep();
          break;
        case 'screensaver':
          window.dispatchEvent(new Event('mra-screensaver'));
          break;
        case 'hireme':
          wmRef.current.open('hireme');
          break;
        case 'switcher':
          window.dispatchEvent(new Event('mra-app-switcher'));
          break;
        default:
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sys],
  );
  useHotCorners(runCorner);
  useBatteryWarnings();

  /* keyboard shortcuts + app switcher */
  useEffect(() => {
    const typing = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (sys.phase !== 'ready' || sys.locked) return;
      const k = e.key;
      // App switcher
      if ((e.altKey && k === 'Tab') || ((e.ctrlKey || e.altKey) && (k === '`' || e.code === 'Backquote'))) {
        const order = [...wmRef.current.windows].sort((a, b) => b.z - a.z).map((w) => w.id);
        if (!order.length) return;
        e.preventDefault();
        const cur = swRef.current;
        if (!cur) setSwitcher({ list: order, i: order.length > 1 ? 1 : 0 });
        else setSwitcher({ ...cur, i: (cur.i + (e.shiftKey ? -1 + cur.list.length : 1)) % cur.list.length });
        return;
      }
      if (swRef.current && k === 'Escape') {
        setSwitcher(null);
        return;
      }
      if ((e.ctrlKey && k === '/') || k === 'F1') {
        e.preventDefault();
        setKb((v) => !v);
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && !typing(e.target)) {
        const w = focusedVisible(wmRef.current);
        if (e.code === 'KeyM' && w) {
          e.preventDefault();
          wmRef.current.minimize(w.id);
        } else if (e.code === 'KeyW' && w) {
          e.preventDefault();
          wmRef.current.close(w.id);
        }
        return;
      }
      if (e.ctrlKey && e.altKey && !e.metaKey) {
        const map: Record<string, () => void> = {
          ArrowLeft: () => tile('left'),
          ArrowRight: () => tile('right'),
          ArrowUp: () => tile('max'),
          ArrowDown: () => tile('center'),
          KeyD: showDesktop,
          KeyS: () => update({ stageManager: !settings.stageManager }),
          KeyN: () => sys.toggleOverlay('notifications'),
          KeyC: () => sys.toggleOverlay('control'),
          KeyH: () => wmRef.current.open('hireme'),
          KeyL: () => sys.lock(),
          KeyP: () => window.dispatchEvent(new Event('mra-share-portfolio')),
        };
        const fn = map[e.code] ?? map[k];
        if (fn) {
          e.preventDefault();
          fn();
        }
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const cur = swRef.current;
      if (cur && (e.key === 'Alt' || e.key === 'Control')) {
        setSwitcher(null);
        const id = cur.list[cur.i];
        if (id) wmRef.current.open(id);
      }
    };
    const openKb = () => setKb(true);
    // v10 — App Switcher from a gesture / menu (stays open until a click or Escape)
    const openSw = () => {
      const order = [...wmRef.current.windows].sort((a, b) => b.z - a.z).map((w) => w.id);
      if (order.length) setSwitcher({ list: order, i: order.length > 1 ? 1 : 0 });
    };
    window.addEventListener('mra-app-switcher', openSw);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onUp);
    window.addEventListener('mra-shortcuts', openKb);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('mra-shortcuts', openKb);
      window.removeEventListener('mra-app-switcher', openSw);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys, settings.stageManager, update]);

  /* share links: #/app/<id>?… opens that app once the desktop is unlocked */
  const handled = useRef(false);
  useEffect(() => {
    if (sys.phase !== 'ready' || sys.locked) return;
    const go = () => {
      const d = parseDeepLink(window.location.hash);
      if (!d || !(d.app in APPS)) return;
      wmRef.current.open(d.app as AppId, Object.keys(d.args).length ? d.args : undefined);
    };
    if (!handled.current) {
      handled.current = true;
      window.setTimeout(go, 600);
    }
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, [sys.phase, sys.locked]);

  /* badges clear when their app is opened */
  const ids = wm.windows.map((w) => w.id).join(',');
  useEffect(() => {
    wm.windows.forEach((w) => {
      if (CLEAR_ON_OPEN.has(w.id)) window.setTimeout(() => clearBadge(w.id), 900);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  /* Stage Manager strip */
  const stage = settings.stageManager && window.innerWidth >= 900;
  useEffect(() => {
    document.querySelector('.desktop')?.classList.toggle('stage-on', stage);
  }, [stage]);
  const strip = stage ? [...wm.windows].filter((w) => w.id !== wm.focusedId && w.phase !== 'closing').sort((a, b) => b.z - a.z).slice(0, 5) : [];

  // Sleep: pause music and every CSS animation until the display wakes
  const music = useMusic();
  const musicRef = useRef(music);
  musicRef.current = music;
  useEffect(() => {
    document.documentElement.classList.toggle('sleeping', sys.asleep);
    if (sys.asleep && musicRef.current.playing) musicRef.current.toggle();
  }, [sys.asleep]);

  return (
    <>
      <ScreenSaver />
      <SeasonLayer />
      {stage && (
        <nav className="stage-strip" aria-label="Stage Manager">
          {strip.map((w, i) => (
            <button key={w.id} type="button" className="stage-item" style={{ animationDelay: `${i * 50}ms` }} onClick={() => wm.open(w.id)} title={APPS[w.id].title}>
              <span className="stage-thumb">
                <span className="stage-bar" />
                <span className="stage-ico">
                  <AppIcon name={APPS[w.id].icon} />
                </span>
              </span>
              <span className="stage-app-ico">
                <AppIcon name={APPS[w.id].icon} />
              </span>
              <span className="stage-label">{APPS[w.id].menuName}</span>
            </button>
          ))}
        </nav>
      )}
      {switcher && <div className="app-switcher-back" onPointerDown={() => setSwitcher(null)} />}
      {switcher && (
        <div className="app-switcher" role="listbox" aria-label="App Switcher">
          {switcher.list.map((id, i) => (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={i === switcher.i}
              className={i === switcher.i ? 'on' : ''}
              onPointerEnter={() => setSwitcher((s) => (s ? { ...s, i } : s))}
              onClick={() => {
                setSwitcher(null);
                wm.open(id);
              }}
            >
              <span className="sw-ico">
                <AppIcon name={APPS[id].icon} />
              </span>
              <span>{APPS[id].menuName}</span>
            </button>
          ))}
        </div>
      )}
      {kb && <ShortcutsSheet onClose={() => setKb(false)} />}
    </>
  );
}
