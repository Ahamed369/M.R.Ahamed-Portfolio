import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { WallImage } from './Wallpaper';
import { AppIcon } from './AppIcons';
import { useSystem } from '../system/SystemContext';
import { useSettings } from '../system/SettingsContext';
import { dockReserve, MENUBAR_H, useWM } from '../system/WindowManager';
import { APPS } from '../system/apps';
import { wallpaperById } from '../data/media';
import type { AppId } from '../system/types';
import { MAX_SPACES, setSpaceCount, spaceWallpaper, switchSpace, useSpaces, windowSpace } from '../system/spaces';

interface Saved {
  /** untransformed layout box of the window (viewport px) */
  x: number;
  y: number;
  w: number;
  h: number;
  /** the exact inline styles we overwrite, restored on exit */
  transform: string;
  origin: string;
  transition: string;
}

interface Thumb {
  id: AppId;
  x: number;
  y: number;
  w: number;
  h: number;
  s: number;
}

const EASE = 'cubic-bezier(.2,.9,.25,1)';
const posEl = (id: AppId) => document.querySelector<HTMLElement>(`.win-pos[data-win-id="${id}"]`);

/** Pick the column count that makes the scaled windows as large as possible, then place them in cells. */
function arrange(items: { id: AppId; w: number; h: number }[], area: { x: number; y: number; w: number; h: number }, gap: number, labelH: number): Thumb[] {
  const n = items.length;
  if (!n) return [];
  let best: { cols: number; score: number } = { cols: 1, score: -1 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cw = (area.w - gap * (cols - 1)) / cols;
    const ch = (area.h - gap * (rows - 1)) / rows - labelH;
    if (cw <= 20 || ch <= 20) continue;
    const score = items.reduce((acc, it) => {
      const s = Math.min(cw / it.w, ch / it.h, 0.8);
      return acc + s * s * it.w * it.h;
    }, 0);
    if (score > best.score) best = { cols, score };
  }
  const cols = best.cols;
  const rows = Math.ceil(n / cols);
  const cw = (area.w - gap * (cols - 1)) / cols;
  const ch = (area.h - gap * (rows - 1)) / rows - labelH;
  const scaled = items.map((it) => ({ it, s: Math.min(cw / it.w, ch / it.h, 0.8) }));
  // tighten the block vertically: rows only as tall as their tallest thumbnail
  const rowH = Array.from({ length: rows }, (_, r) => Math.max(...scaled.slice(r * cols, r * cols + cols).map((x) => x.it.h * x.s)));
  const blockH = rowH.reduce((a, b) => a + b + labelH, 0) + gap * (rows - 1);
  let y = area.y + Math.max(0, (area.h - blockH) / 2);
  const out: Thumb[] = [];
  for (let r = 0; r < rows; r++) {
    const row = scaled.slice(r * cols, r * cols + cols);
    const offset = ((cols - row.length) * (cw + gap)) / 2;
    row.forEach(({ it, s }, c) => {
      const w = it.w * s;
      const h = it.h * s;
      const cx = area.x + offset + c * (cw + gap) + cw / 2;
      out.push({ id: it.id, s, w, h, x: cx - w / 2, y: y + (rowH[r] - h) / 2 });
    });
    y += rowH[r] + labelH + gap;
  }
  return out;
}

/** Mission Control (F3 / Ctrl+↑): every open window slides into a non-overlapping overview. */
export function MissionControl() {
  const sys = useSystem();
  const wm = useWM();
  const { settings, motionReduced } = useSettings();
  const open = sys.overlay === 'missioncontrol';
  const [mounted, setMounted] = useState(open);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const saved = useRef(new Map<AppId, Saved>());
  const exitTimer = useRef(0);
  const dur = motionReduced ? 1 : 480;

  const spaces = useSpaces();
  // v10 — App Exposé: only one app's windows (pinch over a window, or Dock → Show All Windows)
  const [only, setOnly] = useState<AppId | null>(null);
  useEffect(() => {
    const on = (e: Event) => setOnly(((e as CustomEvent).detail as AppId) ?? null);
    window.addEventListener('mra-mc-filter', on);
    return () => window.removeEventListener('mra-mc-filter', on);
  }, []);
  useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => setOnly(null), 520);
      return () => window.clearTimeout(t);
    }
  }, [open]);
  const visible = wm.windows.filter(
    (w) => w.phase !== 'minimized' && w.phase !== 'minimizing' && w.phase !== 'closing' && windowSpace(w.id) === spaces.current && (!only || w.id === only),
  );
  const visibleKey = visible
    .map((w) => w.id)
    .sort()
    .join(',');

  /* keyboard: F3 and Ctrl+↑ toggle; Escape exits */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F3' || (e.ctrlKey && !e.metaKey && !e.altKey && e.key === 'ArrowUp')) {
        e.preventDefault();
        sys.toggleOverlay('missioncontrol');
      } else if (e.key === 'Escape' && open) sys.setOverlay('none');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sys, open]);

  /* exit when the Dock or menu bar is used */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest?.('.dock-wrap, .menubar')) sys.setOverlay('none');
    };
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, sys]);

  /* enter / re-layout */
  useLayoutEffect(() => {
    if (!open) return;
    window.clearTimeout(exitTimer.current);
    setMounted(true);
    document.documentElement.classList.add('mc-active');
    const ids = visibleKey ? (visibleKey.split(',') as AppId[]) : [];
    const map = saved.current;
    // windows that went away while open: give their styles back
    map.forEach((sv, id) => {
      if (ids.includes(id)) return;
      const el = posEl(id);
      if (el) {
        el.style.transition = sv.transition;
        el.style.transform = sv.transform;
        el.style.transformOrigin = sv.origin;
      }
      map.delete(id);
    });
    ids.forEach((id) => {
      if (map.has(id)) return;
      const el = posEl(id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      map.set(id, { x: r.left, y: r.top, w: el.offsetWidth, h: el.offsetHeight, transform: el.style.transform, origin: el.style.transformOrigin, transition: el.style.transition });
    });
    const phone = size.w < 700;
    const top = MENUBAR_H + (phone ? 96 : 128);
    const bottom = size.h - dockReserve() - (phone ? 8 : 16);
    const side = phone ? 14 : Math.max(36, size.w * 0.05);
    const items = [...map.entries()].sort((a, b) => a[1].x + a[1].y * 0.2 - (b[1].x + b[1].y * 0.2)).map(([id, sv]) => ({ id, w: sv.w, h: sv.h }));
    const next = arrange(items, { x: side, y: top, w: size.w - side * 2, h: Math.max(80, bottom - top) }, phone ? 14 : 34, phone ? 30 : 34);
    next.forEach((t) => {
      const el = posEl(t.id);
      if (!el) return;
      el.style.transition = `transform ${dur}ms ${EASE}`;
      el.style.transformOrigin = '0 0';
      el.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.s})`;
    });
    setThumbs(next);
  }, [open, visibleKey, size, dur]);

  /* exit: animate back, then restore the original inline styles exactly */
  useLayoutEffect(() => {
    if (open) return;
    const map = saved.current;
    if (!map.size) {
      document.documentElement.classList.remove('mc-active');
      return;
    }
    map.forEach((sv, id) => {
      const el = posEl(id);
      if (el) el.style.transform = sv.transform;
    });
    exitTimer.current = window.setTimeout(() => {
      map.forEach((sv, id) => {
        const el = posEl(id);
        if (!el) return;
        el.style.transition = sv.transition;
        el.style.transformOrigin = sv.origin;
        el.style.transform = sv.transform;
      });
      map.clear();
      document.documentElement.classList.remove('mc-active');
      setMounted(false);
    }, dur + 30);
    return () => window.clearTimeout(exitTimer.current);
  }, [open, dur]);

  useEffect(() => {
    if (!open && !saved.current.size && mounted) {
      const t = window.setTimeout(() => setMounted(false), motionReduced ? 1 : 320);
      return () => window.clearTimeout(t);
    }
  }, [open, mounted, motionReduced]);

  if (!mounted) return null;
  const exit = () => sys.setOverlay('none');
  const wp = wallpaperById(settings.wallpaper);
  const ratio = size.w / size.h;

  return (
    <>
      <div className={`mc-backdrop ${open ? 'open' : ''}`} aria-hidden="true" />
      <div
        className={`mc-layer ${open ? 'open' : ''}`}
        role="dialog"
        aria-label="Mission Control"
        onClick={(e) => {
          if (e.target === e.currentTarget) exit();
        }}
      >
        <div className="mc-spaces" onClick={(e) => e.target === e.currentTarget && exit()}>
          {only ? (
            <span className="mc-expose-title">
              <AppIcon name={APPS[only].icon} /> App Exposé · {APPS[only].title}
            </span>
          ) : (
            <>
              {Array.from({ length: spaces.count }, (_, i) => {
                const swp = i === 0 ? wp : wallpaperById(spaceWallpaper(i, settings.wallpaper));
                const n = wm.windows.filter((w) => windowSpace(w.id) === i && w.phase !== 'minimized').length;
                return (
                  <div key={i} className={`mc-space-wrap ${i === spaces.current ? 'cur' : ''}`}>
                    <button
                      type="button"
                      className="mc-space"
                      onClick={() => {
                        switchSpace(i);
                        exit();
                      }}
                      aria-label={`Desktop ${i + 1}${n ? ` — ${n} window${n === 1 ? '' : 's'}` : ''}`}
                      style={{ ['--mc-ratio' as string]: ratio }}
                    >
                      <span className="mc-space-img">
                        {i === 0 && settings.customWallpaper && settings.wallpaper === 'custom' ? <img src={settings.customWallpaper} alt="" draggable={false} /> : <WallImage id={swp.id} thumb />}
                        {n > 0 && <i className="mc-space-n">{n}</i>}
                      </span>
                      <span className="mc-space-label">Desktop {i + 1}</span>
                    </button>
                    {spaces.count > 1 && i === spaces.count - 1 && (
                      <button type="button" className="mc-space-x" aria-label={`Remove Desktop ${i + 1}`} onClick={() => setSpaceCount(spaces.count - 1)}>
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
              {spaces.count < MAX_SPACES && (
                <button type="button" className="mc-space-add" aria-label="Add a desktop" onClick={() => setSpaceCount(spaces.count + 1)}>
                  +
                </button>
              )}
            </>
          )}
        </div>
        {open && !visible.length && <div className="mc-empty">No open windows</div>}
        {thumbs.map((t, i) => {
          const win = visible.find((w) => w.id === t.id);
          if (!win) return null;
          const meta = APPS[t.id];
          const title = win.args?.title ?? meta.title;
          return (
            <button
              key={t.id}
              type="button"
              className="mc-thumb"
              style={{ left: t.x, top: t.y, width: t.w, height: t.h, ['--i' as string]: i }}
              aria-label={`${title} — bring to front`}
              onClick={() => {
                wm.focus(t.id);
                exit();
              }}
            >
              <span className="mc-label">
                <span className="mc-label-ico" aria-hidden="true">
                  <AppIcon name={meta.icon} />
                </span>
                <span className="mc-label-txt">{title}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
