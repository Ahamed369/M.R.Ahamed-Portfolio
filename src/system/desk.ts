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
export function useFreeDrag(opts: { enabled: boolean; snap?: number; onDrop: (p: Pos, el: HTMLElement) => void; ignore?: string }) {
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
        try {
          s.el.setPointerCapture(s.id);
        } catch {
          /* ignore */
        }
      }
      s.el.style.translate = `${dx}px ${dy}px`;
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
