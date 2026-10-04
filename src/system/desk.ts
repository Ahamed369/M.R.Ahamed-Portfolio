import { useCallback, useRef, type PointerEvent as RPointerEvent } from 'react';
import { usePersisted } from './useStore';

/**
 * v9 — free placement on the desktop (like macOS):
 *  - widgets and desktop icons can be dragged anywhere; positions are saved
 *  - apps can be added to the desktop as shortcuts (right-click → Add App to Desktop)
 * Everything is stored in this browser only.
 */
export type Pos = { x: number; y: number };
export type PosMap = Record<string, Pos>;

export const useWidgetPositions = () => usePersisted<PosMap>('mra-widget-pos-v9', {});
export const useIconPositions = () => usePersisted<PosMap>('mra-icon-pos-v9', {});
/** Launch-item ids the visitor pinned to the desktop */
export const useDeskApps = () => usePersisted<string[]>('mra-desk-apps-v9', []);

export const DESK_GRID = 92;

/** keep a dragged element on screen (below the menu bar) */
export function clampPos(x: number, y: number, w: number, h: number): Pos {
  const maxX = window.innerWidth - Math.min(w, 60);
  const maxY = window.innerHeight - Math.min(h, 60);
  return { x: Math.round(Math.max(-w + 60, Math.min(maxX, x))), y: Math.round(Math.max(28, Math.min(maxY, y))) };
}

/**
 * Pointer-driven dragging for an absolutely placed element.
 * The drag starts after a 5 px threshold, so clicks / double-clicks still work;
 * `wasDragged()` lets click handlers ignore the click that ends a drag.
 */
export function useFreeDrag(opts: {
  enabled: boolean;
  snap?: number;
  onDrop: (p: Pos, el: HTMLElement) => void;
  ignore?: string;
  /** v10.3 — turn a raw drop point into a valid slot (snapped, on screen, not overlapping); null = no room → slide back */
  resolve?: (x: number, y: number, w: number, h: number, el: HTMLElement) => Pos | null;
  /** v10.3 — live preview of the slot while dragging (null hides it) */
  onPreview?: (p: Pos | null, w: number, h: number) => void;
  /** v10.3 — called once when a drag really starts / ends (for collision caches) */
  onStart?: (el: HTMLElement) => void;
  onEnd?: () => void;
}) {
  const st = useRef<{ id: number; sx: number; sy: number; rect: DOMRect; el: HTMLElement; on: boolean } | null>(null);
  const dragged = useRef(0);
  const o = useRef(opts);
  o.current = opts;

  const onPointerDown = useCallback((e: RPointerEvent<HTMLElement>) => {
    if (!o.current.enabled || e.button !== 0 || e.pointerType === 'touch') return;
    const t = e.target as HTMLElement;
    if (o.current.ignore && t.closest(o.current.ignore)) return;
    const el = e.currentTarget;
    st.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, rect: el.getBoundingClientRect(), el, on: false };
    const move = (ev: PointerEvent) => {
      const s = st.current;
      if (!s || ev.pointerId !== s.id) return;
      const dx = ev.clientX - s.sx;
      const dy = ev.clientY - s.sy;
      if (!s.on) {
        if (Math.hypot(dx, dy) < 5) return;
        s.on = true;
        s.el.classList.add('free-dragging');
        o.current.onStart?.(s.el);
        try {
          s.el.setPointerCapture(s.id);
        } catch {
          /* ignore */
        }
      }
      s.el.style.translate = `${dx}px ${dy}px`;
      if (o.current.onPreview && o.current.resolve) o.current.onPreview(o.current.resolve(s.rect.left + dx, s.rect.top + dy, s.rect.width, s.rect.height, s.el), s.rect.width, s.rect.height);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      const s = st.current;
      st.current = null;
      if (!s || !s.on) return;
      dragged.current = performance.now();
      s.el.classList.remove('free-dragging');
      s.el.style.translate = '';
      let x = s.rect.left + (ev.clientX - s.sx);
      let y = s.rect.top + (ev.clientY - s.sy);
      o.current.onPreview?.(null, 0, 0);
      o.current.onEnd?.();
      if (o.current.resolve) {
        const r = o.current.resolve(x, y, s.rect.width, s.rect.height, s.el);
        if (r) o.current.onDrop(r, s.el);
        return;
      }
      const g = o.current.snap;
      if (g) {
        x = Math.round(x / g) * g + 6;
        y = Math.round((y - 28) / g) * g + 34;
      }
      o.current.onDrop(clampPos(x, y, s.rect.width, s.rect.height), s.el);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, []);

  const wasDragged = useCallback(() => performance.now() - dragged.current < 250, []);
  return { onPointerDown, wasDragged };
}

/* ───────────── v10.3 — widget slots on the Mac desktop ───────────── */

export const WIDGET_GRID = 12;
export interface Rect { x: number; y: number; w: number; h: number }
const overlaps = (a: Rect, b: Rect, gap: number) => a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;

/** The desktop area widgets may use: below the menu bar, above the Dock, clear of the screen edges. */
export function widgetBounds(): Rect {
  const W = window.innerWidth;
  const H = window.innerHeight;
  // same origin as the widget columns (14 px from the left, 12 px under the menu bar)
  const left = 14;
  const top = 38;
  let right = W - 14;
  let bottom = H - 12;
  const dock = document.querySelector('.dock-wrap:not(.autohide) .dock')?.getBoundingClientRect();
  if (dock && dock.width) {
    if (dock.width >= dock.height) bottom = Math.min(bottom, dock.top - 10);
    else if (dock.left < W / 2) return { x: Math.max(left, dock.right + 12), y: top, w: right - Math.max(left, dock.right + 12), h: bottom - top };
    else right = Math.min(right, dock.left - 12);
  }
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * Snap (x, y) to the widget grid inside the desktop bounds, then — if that
 * spot touches another widget — search outwards for the nearest free slot.
 * Returns null when there's no room anywhere (the widget slides back).
 */
export function findWidgetSlot(x: number, y: number, w: number, h: number, others: Rect[], gap = 10): Pos | null {
  const b = widgetBounds();
  const G = WIDGET_GRID;
  const clampX = (v: number) => Math.max(b.x, Math.min(b.x + b.w - w, v));
  const clampY = (v: number) => Math.max(b.y, Math.min(b.y + b.h - h, v));
  if (w > b.w || h > b.h) return null;
  const snap = (v: number, o: number) => Math.round((v - o) / G) * G + o;
  const sx = clampX(snap(x, b.x));
  const sy = clampY(snap(y, b.y));
  const free = (px: number, py: number) => !others.some((r) => overlaps({ x: px, y: py, w, h }, r, gap));
  if (free(sx, sy)) return { x: sx, y: sy };
  for (let ring = 1; ring < 80; ring++) {
    let best: Pos | null = null;
    let bestD = Infinity;
    for (let dx = -ring; dx <= ring; dx++)
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const px = clampX(sx + dx * G);
        const py = clampY(sy + dy * G);
        if (!free(px, py)) continue;
        const d = Math.hypot(px - sx, py - sy);
        if (d < bestD) {
          bestD = d;
          best = { x: px, y: py };
        }
      }
    if (best) return best;
  }
  return null;
}
