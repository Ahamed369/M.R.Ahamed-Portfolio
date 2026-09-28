import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type MouseEvent as RMouseEvent,
  type PointerEvent as RPointerEvent,
  type ReactNode,
} from 'react';
import type { Rect, WindowState } from '../system/types';
import { APPS } from '../system/apps';
import { clampRect, dockReserve, MENUBAR_H, useWM } from '../system/WindowManager';
import { useSettings } from '../system/SettingsContext';
import { useSystem } from '../system/SystemContext';
import { genie } from '../system/genie';
import { tileRect, type TileZone } from './SystemExtras';

/** Size a window had before it was tiled — restored when it is dragged out again. */
const preTile = new Map<string, { w: number; h: number }>();

function zoneAt(x: number, y: number): TileZone | null {
  const W = window.innerWidth;
  const H = window.innerHeight;
  if (y <= MENUBAR_H + 1) return 'max';
  const nearTop = y < MENUBAR_H + 90;
  const nearBottom = y > H - 150;
  if (x <= 4) return nearTop ? 'tl' : nearBottom ? 'bl' : 'left';
  if (x >= W - 5) return nearTop ? 'tr' : nearBottom ? 'br' : 'right';
  return null;
}

/* ─────────────── Chrome context: lets apps build unified toolbars ─────────────── */

interface ChromeCtx {
  onContextMenu?: (e: RMouseEvent<HTMLElement>) => void;
  onDragStart: (e: RPointerEvent<HTMLElement>) => void;
  onToggleMax: () => void;
  lights: ReactNode;
  active: boolean;
}
const Chrome = createContext<ChromeCtx | null>(null);

export function useChrome(): ChromeCtx {
  const c = useContext(Chrome);
  if (!c) throw new Error('useChrome outside Window');
  return c;
}

/** A draggable toolbar region for seamless windows. */
export function DragBar({ className, children }: { className?: string; children?: ReactNode }) {
  const { onDragStart, onToggleMax, onContextMenu } = useChrome();
  return (
    <div
      className={`drag-bar ${className ?? ''}`}
      onPointerDown={onDragStart}
      onDoubleClick={onToggleMax}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) onContextMenu?.(e);
      }}
    >
      {children}
    </div>
  );
}

export function Lights() {
  return <>{useChrome().lights}</>;
}

/* ─────────────────────────────── Traffic lights ─────────────────────────────── */

function TrafficLights({ onClose, onMin, onMax, maximized }: { onClose: () => void; onMin: () => void; onMax: () => void; maximized: boolean }) {
  const stop = (e: RPointerEvent) => e.stopPropagation();
  return (
    <div className="traffic" onPointerDown={stop} onDoubleClick={(e) => e.stopPropagation()}>
      <button type="button" className="tl tl-close" aria-label="Close window" onClick={onClose}>
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" />
        </svg>
      </button>
      <button type="button" className="tl tl-min" aria-label="Minimize window" onClick={onMin}>
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 5h6" />
        </svg>
      </button>
      <button type="button" className="tl tl-max" aria-label={maximized ? 'Restore window size' : 'Maximize window'} onClick={onMax}>
        <svg viewBox="0 0 10 10" aria-hidden="true">
          {maximized ? <path className="fill" d="M5 5V1.6L8.4 5ZM5 5v3.4L1.6 5Z" /> : <path className="fill" d="M2.2 2.2h4L2.2 6.2ZM7.8 7.8h-4l4-4Z" />}
        </svg>
      </button>
    </div>
  );
}

/* ─────────────────────────────────── Window ─────────────────────────────────── */

interface Props {
  win: WindowState;
  focused: boolean;
  compact: boolean;
  children: ReactNode;
}

const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';

/** Briefly reveal an auto-hidden Dock so the Genie has somewhere to go. */
function peekDock() {
  const root = document.documentElement;
  root.classList.add('dock-peek');
  window.clearTimeout((peekDock as unknown as { t?: number }).t);
  (peekDock as unknown as { t?: number }).t = window.setTimeout(() => root.classList.remove('dock-peek'), 1100);
}

export function Window({ win, focused, compact, children }: Props) {
  const wm = useWM();
  const { motionReduced, settings } = useSettings();
  // v9: the Genie plays unless the portfolio's own "Reduce motion" is on (the
  // operating-system preference alone no longer disables it — on Windows that
  // preference is often switched off globally, which hid the effect).
  const useGenie = settings.minimizeEffect === 'genie' && !settings.reduceMotion;
  const dockSide = settings.dockPosition ?? 'bottom';
  const toIcon = !!settings.minimizeToAppIcon;
  const meta = APPS[win.id];
  const posRef = useRef<HTMLDivElement>(null);
  const winRef = useRef<HTMLElement>(null);
  const live = useRef<Rect>(win.rect);

  const rect: Rect = compact
    ? { x: 0, y: MENUBAR_H, w: window.innerWidth, h: window.innerHeight - MENUBAR_H - dockReserve() + 4 }
    : win.rect;
  live.current = rect;

  const dur = useCallback((ms: number) => (motionReduced ? 1 : ms), [motionReduced]);

  /* ───── phase-driven animations (Web Animations API → GPU transforms) ───── */
  useLayoutEffect(() => {
    const el = winRef.current;
    if (!el) return;
    const { id } = win;
    let anim: Animation | null = null;

    const dockTarget = () => {
      const target =
        (win.phase === 'minimizing' || win.phase === 'restoring' ? document.querySelector<HTMLElement>(`[data-dock-id="min-${id}"]`) : null) ??
        document.querySelector<HTMLElement>(`[data-dock-id="${id}"]`) ??
        document.querySelector<HTMLElement>('[data-dock-id="trash"]');
      const r = live.current;
      if (!target) return { dx: 0, dy: window.innerHeight - r.y };
      const t = target.getBoundingClientRect();
      return { dx: t.left + t.width / 2 - (r.x + r.w / 2), dy: t.top + t.height / 2 - (r.y + r.h / 2) };
    };

    switch (win.phase) {
      case 'opening':
        el.getAnimations().forEach((a) => a.cancel());
        {
          // Grow out of the Dock icon (or from the centre when launched elsewhere)
          const hasIcon = !!document.querySelector(`[data-dock-id="${id}"]`);
          const { dx, dy } = hasIcon ? dockTarget() : { dx: 0, dy: 24 };
          anim = el.animate(
            [
              { opacity: 0, transform: `translate(${dx * 0.55}px, ${dy * 0.55}px) scale(.32)`, filter: 'blur(8px)', offset: 0 },
              { opacity: 1, transform: `translate(${dx * 0.04}px, ${dy * 0.04}px) scale(.97)`, filter: 'blur(0px)', offset: 0.7 },
              { opacity: 1, transform: 'none', filter: 'blur(0px)', offset: 1 },
            ],
            { duration: dur(420), easing: EASE_OUT },
          );
        }
        anim.onfinish = () => wm.setPhase(id, 'open');
        break;
      case 'closing':
        anim = el.animate(
          [
            { opacity: 1, transform: 'none', filter: 'blur(0px)' },
            { opacity: 0, transform: 'scale(.92)', filter: 'blur(4px)' },
          ],
          { duration: dur(190), easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' },
        );
        anim.onfinish = () => wm.remove(id);
        break;
      case 'minimizing': {
        if (useGenie) {
          peekDock();
          const target = (toIcon ? null : document.querySelector<HTMLElement>(`[data-dock-id="min-${id}"]`)) ?? document.querySelector<HTMLElement>(`[data-dock-id="${id}"]`) ?? document.querySelector<HTMLElement>('[data-dock-id="trash"]');
          if (target) {
            const r = live.current;
            const t = target.getBoundingClientRect();
            let cancelled = false;
            el.style.opacity = '0';
            void genie(el, { x: r.x, y: r.y, w: r.w, h: r.h }, { x: t.left, y: t.top, w: t.width, h: t.height }, 'min', 640, dockSide).then(() => {
              el.style.opacity = '';
              if (!cancelled) wm.setPhase(id, 'minimized');
            });
            return () => {
              cancelled = true;
            };
          }
        }
        const { dx, dy } = dockTarget();
        anim = el.animate(
          [
            { opacity: 1, transform: 'none', offset: 0 },
            { opacity: 0.9, transform: `translate(${dx * 0.25}px, ${dy * 0.55}px) scale(.62, .4)`, offset: 0.55 },
            { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.05)`, offset: 1 },
          ],
          { duration: dur(480), easing: 'cubic-bezier(.55,0,.25,1)', fill: 'forwards' },
        );
        anim.onfinish = () => wm.setPhase(id, 'minimized');
        break;
      }
      case 'restoring': {
        el.getAnimations().forEach((a) => a.cancel());
        if (useGenie) {
          peekDock();
          const target = (toIcon ? null : document.querySelector<HTMLElement>(`[data-dock-id="min-${id}"]`)) ?? document.querySelector<HTMLElement>(`[data-dock-id="${id}"]`) ?? document.querySelector<HTMLElement>('[data-dock-id="trash"]');
          if (target) {
            const r = live.current;
            const t = target.getBoundingClientRect();
            let cancelled = false;
            el.style.opacity = '0';
            void genie(el, { x: r.x, y: r.y, w: r.w, h: r.h }, { x: t.left, y: t.top, w: t.width, h: t.height }, 'restore', 560, dockSide).then(() => {
              el.style.opacity = '';
              if (!cancelled) wm.setPhase(id, 'open');
            });
            return () => {
              cancelled = true;
              el.style.opacity = '';
            };
          }
        }
        const { dx, dy } = dockTarget();
        anim = el.animate(
          [
            { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.05)`, offset: 0 },
            { opacity: 0.9, transform: `translate(${dx * 0.25}px, ${dy * 0.55}px) scale(.62, .4)`, offset: 0.45 },
            { opacity: 1, transform: 'none', offset: 1 },
          ],
          { duration: dur(440), easing: 'cubic-bezier(.2,.8,.3,1)' },
        );
        anim.onfinish = () => wm.setPhase(id, 'open');
        break;
      }
      default:
        break;
    }
    return () => {
      if (anim) anim.onfinish = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.phase]);

  /* ─────────────────────────────── dragging (+ v8 edge tiling) ─────────────────────────────── */
  const tiling = settings.windowTiling && !compact;
  const onDragStart = useCallback(
    (e: RPointerEvent<HTMLElement>) => {
      if (e.button !== 0 || compact || win.maximized) return;
      if ((e.target as HTMLElement).closest('button, input, a, select, textarea, [data-nodrag]')) return;
      const pos = posRef.current;
      if (!pos) return;
      e.preventDefault();
      wm.focus(win.id);
      const startRect = { ...live.current };
      // Dragging a tiled window restores its earlier size under the pointer
      const pre = preTile.get(win.id);
      if (pre && tiling) {
        const fx = (e.clientX - startRect.x) / startRect.w;
        startRect.x = Math.round(e.clientX - pre.w * Math.min(0.9, Math.max(0.1, fx)));
        startRect.w = pre.w;
        startRect.h = pre.h;
      }
      const start = { px: e.clientX, py: e.clientY, ...startRect };
      let next: Rect = { ...startRect };
      let frame = 0;
      let zone: TileZone | null = null;
      let preview: HTMLDivElement | null = null;
      let resized = false;
      pos.classList.add('dragging');
      document.body.classList.add('is-dragging');
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const showZone = (z: TileZone | null) => {
        if (z === zone) return;
        zone = z;
        if (!z) {
          preview?.remove();
          preview = null;
          return;
        }
        const r = tileRect(z);
        if (!preview) {
          preview = document.createElement('div');
          preview.className = 'snap-preview';
          document.body.appendChild(preview);
        }
        Object.assign(preview.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
      };

      const move = (ev: PointerEvent) => {
        next = clampRect({ ...start, x: start.x + ev.clientX - start.px, y: start.y + ev.clientY - start.py });
        if (tiling) showZone(zoneAt(ev.clientX, ev.clientY));
        if (!frame)
          frame = requestAnimationFrame(() => {
            frame = 0;
            if (pre && tiling && !resized) {
              resized = true;
              pos.style.width = `${start.w}px`;
              pos.style.height = `${start.h}px`;
            }
            pos.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
          });
      };
      const up = () => {
        cancelAnimationFrame(frame);
        preview?.remove();
        pos.classList.remove('dragging');
        document.body.classList.remove('is-dragging');
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
        target.removeEventListener('pointercancel', up);
        if (zone) {
          if (!preTile.has(win.id)) preTile.set(win.id, { w: pre?.w ?? live.current.w, h: pre?.h ?? live.current.h });
          pos.classList.add('snapping');
          window.setTimeout(() => pos.classList.remove('snapping'), 380);
          if (zone === 'max') {
            wm.setRect(win.id, next);
            window.requestAnimationFrame(() => wm.toggleMaximize(win.id));
          } else wm.setRect(win.id, tileRect(zone));
          return;
        }
        pos.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
        if (resized) preTile.delete(win.id);
        if (next.x !== startRect.x || next.y !== startRect.y || resized) wm.setRect(win.id, resized ? next : { ...next, w: live.current.w, h: live.current.h });
      };
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
      target.addEventListener('pointercancel', up);
    },
    [compact, win.maximized, win.id, wm, tiling],
  );

  /* ─────────────────────────────── resizing ─────────────────────────────── */
  const onResizeStart = useCallback(
    (e: RPointerEvent<HTMLElement>, dir: 'r' | 'b' | 'rb') => {
      if (e.button !== 0 || compact) return;
      const pos = posRef.current;
      if (!pos) return;
      e.preventDefault();
      e.stopPropagation();
      wm.focus(win.id);
      const start = { px: e.clientX, py: e.clientY, ...live.current };
      let next: Rect = { ...live.current };
      pos.classList.add('dragging');
      document.body.classList.add('is-dragging');
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const w = dir === 'b' ? start.w : Math.max(meta.min.w, Math.min(window.innerWidth - start.x, start.w + ev.clientX - start.px));
        const h = dir === 'r' ? start.h : Math.max(meta.min.h, Math.min(window.innerHeight - start.y - 8, start.h + ev.clientY - start.py));
        next = { x: start.x, y: start.y, w, h };
        pos.style.width = `${w}px`;
        pos.style.height = `${h}px`;
      };
      const up = () => {
        pos.classList.remove('dragging');
        document.body.classList.remove('is-dragging');
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
        target.removeEventListener('pointercancel', up);
        wm.setRect(win.id, next);
      };
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
      target.addEventListener('pointercancel', up);
    },
    [compact, meta.min.h, meta.min.w, win.id, wm],
  );

  const dblAction = settings.titleBarDoubleClick ?? 'zoom';
  const onToggleMax = useCallback(() => {
    if (dblAction === 'none') return;
    if (dblAction === 'minimize') return wm.minimize(win.id);
    if (!compact) wm.toggleMaximize(win.id);
  }, [compact, win.id, wm, dblAction]);

  const lights = useMemo(
    () => (
      <TrafficLights
        maximized={win.maximized || compact}
        onClose={() => wm.close(win.id)}
        onMin={() => wm.minimize(win.id)}
        onMax={() => !compact && wm.toggleMaximize(win.id)}
      />
    ),
    [win.maximized, compact, wm, win.id],
  );

  const sys = useSystem();
  const onContextMenu = useCallback(
    (e: RMouseEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const tile = (z: TileZone) => () => {
        const pos = posRef.current;
        pos?.classList.add('snapping');
        window.setTimeout(() => pos?.classList.remove('snapping'), 380);
        if (!preTile.has(win.id)) preTile.set(win.id, { w: live.current.w, h: live.current.h });
        wm.setRect(win.id, tileRect(z));
      };
      sys.setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          { label: 'Minimize', action: () => wm.minimize(win.id) },
          { label: win.maximized ? 'Restore Size' : 'Zoom', action: () => wm.toggleMaximize(win.id), disabled: compact },
          { label: '', sep: true },
          { label: 'Tile Left', action: tile('left'), disabled: compact },
          { label: 'Tile Right', action: tile('right'), disabled: compact },
          { label: 'Center', action: tile('center'), disabled: compact },
          { label: '', sep: true },
          { label: `Close ${meta.menuName}`, action: () => wm.close(win.id) },
        ],
      });
    },
    [sys, wm, win.id, win.maximized, compact, meta.menuName],
  );
  const chrome = useMemo(() => ({ onDragStart, onToggleMax, onContextMenu, lights, active: focused }), [onDragStart, onToggleMax, onContextMenu, lights, focused]);

  const hidden = win.phase === 'minimized';
  const classes = [
    'window',
    focused ? 'is-active' : 'is-inactive',
    meta.darkChrome ? 'dark-chrome' : '',
    meta.seamless ? 'seamless' : '',
    `app-${win.id}`,
  ].join(' ');

  return (
    <div
      ref={posRef}
      data-win-id={win.id}
      className={`win-pos ${win.maximized ? 'is-max' : ''} ${compact ? 'is-compact' : ''}`}
      style={{
        transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
        width: rect.w,
        height: rect.h,
        zIndex: win.z,
        visibility: hidden ? 'hidden' : undefined,
        pointerEvents: win.phase === 'closing' || win.phase === 'minimizing' || hidden ? 'none' : undefined,
      }}
    >
      <section
        ref={winRef}
        className={classes}
        role="dialog"
        aria-label={meta.title}
        aria-hidden={hidden || undefined}
        onPointerDownCapture={() => wm.focus(win.id)}
      >
        <Chrome.Provider value={chrome}>
          {!meta.seamless && (
            <header className="titlebar" onPointerDown={onDragStart} onDoubleClick={onToggleMax} onContextMenu={onContextMenu}>
              {lights}
              <div className="title">{win.args?.title ?? meta.title}</div>
            </header>
          )}
          <div className="window-body">{children}</div>
        </Chrome.Provider>
        {!compact && !win.maximized && (
          <>
            <div className="rz rz-r" onPointerDown={(e) => onResizeStart(e, 'r')} />
            <div className="rz rz-b" onPointerDown={(e) => onResizeStart(e, 'b')} />
            <div className="rz rz-rb" onPointerDown={(e) => onResizeStart(e, 'rb')} />
          </>
        )}
      </section>
    </div>
  );
}
