import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type { AppId, Rect, WindowState } from './types';
import { APPS } from './apps';

export const MENUBAR_H = 26;

/** v9 — which edge the Dock sits on (phones always use the bottom). */
export function dockSide(): 'bottom' | 'left' | 'right' {
  const d = document.documentElement.dataset.dock;
  if (window.innerWidth < 700) return 'bottom';
  return d === 'left' || d === 'right' ? d : 'bottom';
}
function dockHidden(): boolean {
  return document.documentElement.dataset.dockHide === 'on' && window.innerWidth >= 700;
}
/** Space kept free at the bottom of the screen for the Dock. */
export function dockReserve(): number {
  if (dockSide() !== 'bottom') return 8;
  if (dockHidden()) return 10;
  const size = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-size')) || 48;
  return size + 26;
}
/** Space kept free at the left / right edge for a side Dock. */
export function dockSideReserve(): { left: number; right: number } {
  const side = dockSide();
  if (side === 'bottom' || dockHidden()) return { left: 0, right: 0 };
  const size = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-size')) || 48;
  return side === 'left' ? { left: size + 26, right: 0 } : { left: 0, right: size + 26 };
}

export function isCompact(): boolean {
  return window.innerWidth < 700;
}

/** Keep a window's title bar reachable inside the viewport. */
export function clampRect(r: Rect): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const minVisible = 90;
  const x = Math.min(Math.max(r.x, minVisible - r.w), vw - minVisible);
  const y = Math.min(Math.max(r.y, MENUBAR_H), vh - 44);
  return { ...r, x, y };
}

const PRESET_POS: Partial<Record<AppId, (w: number, h: number) => { x: number; y: number }>> = {
  about: () => ({ x: 28, y: MENUBAR_H + 18 }),
};

function initialRect(id: AppId, cascade: number): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const meta = APPS[id];
  const availH = vh - MENUBAR_H - dockReserve() - 16;
  const w = Math.min(meta.size.w, vw - 24);
  const h = Math.min(meta.size.h, Math.max(availH, meta.min.h));
  const preset = PRESET_POS[id]?.(w, h);
  const off = (cascade % 5) * 22;
  const x = preset ? preset.x : Math.round((vw - w) / 2) + off - 44;
  const y = preset ? preset.y : Math.round(MENUBAR_H + Math.max(10, (availH - h) / 2)) + off * 0.6;
  return clampRect({ x: Math.max(8, x), y, w, h });
}

export function maximizedRect(): Rect {
  const sr = dockSideReserve();
  return { x: sr.left, y: MENUBAR_H, w: window.innerWidth - sr.left - sr.right, h: window.innerHeight - MENUBAR_H - dockReserve() + 4 };
}

interface State {
  windows: WindowState[];
  topZ: number;
  opened: number;
}

type Action =
  | { type: 'open'; id: AppId; args?: Record<string, string> }
  | { type: 'focus'; id: AppId }
  | { type: 'phase'; id: AppId; phase: WindowState['phase'] }
  | { type: 'remove'; id: AppId }
  | { type: 'rect'; id: AppId; rect: Rect }
  | { type: 'toggleMax'; id: AppId }
  | { type: 'closeAll' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'open': {
      const existing = state.windows.find((w) => w.id === action.id);
      const topZ = state.topZ + 1;
      if (existing) {
        return {
          ...state,
          topZ,
          windows: state.windows.map((w) =>
            w.id === action.id
              ? {
                  ...w,
                  z: topZ,
                  phase: w.phase === 'minimized' || w.phase === 'minimizing' ? 'restoring' : w.phase === 'closing' ? 'opening' : w.phase,
                  fromMin: w.phase === 'minimized' || w.phase === 'minimizing' ? true : w.fromMin,
                  args: action.args ?? w.args,
                  launchKey: action.args ? w.launchKey + 1 : w.launchKey,
                }
              : w,
          ),
        };
      }
      const win: WindowState = {
        id: action.id,
        rect: initialRect(action.id, state.opened),
        z: topZ,
        phase: 'opening',
        maximized: false,
        args: action.args,
        launchKey: 0,
      };
      return { ...state, topZ, opened: state.opened + 1, windows: [...state.windows, win] };
    }
    case 'focus': {
      const w = state.windows.find((x) => x.id === action.id);
      if (!w || w.z === state.topZ) return state;
      const topZ = state.topZ + 1;
      return { ...state, topZ, windows: state.windows.map((x) => (x.id === action.id ? { ...x, z: topZ } : x)) };
    }
    case 'phase':
      return { ...state, windows: state.windows.map((w) => (w.id === action.id ? { ...w, phase: action.phase, fromMin: action.phase === 'restoring' ? w.fromMin : false } : w)) };
    case 'remove':
      return { ...state, windows: state.windows.filter((w) => w.id !== action.id) };
    case 'rect':
      return {
        ...state,
        windows: state.windows.map((w) => (w.id === action.id ? { ...w, rect: action.rect, maximized: false } : w)),
      };
    case 'toggleMax':
      return {
        ...state,
        windows: state.windows.map((w) => {
          if (w.id !== action.id) return w;
          if (w.maximized) return { ...w, maximized: false, rect: w.prevRect ?? w.rect, prevRect: undefined };
          return { ...w, maximized: true, prevRect: w.rect, rect: maximizedRect() };
        }),
      };
    case 'closeAll':
      // keep the same state object when nothing is open (avoids re-render loops)
      return state.windows.length ? { ...state, windows: [] } : state;
    default:
      return state;
  }
}

interface WM {
  windows: WindowState[];
  focusedId: AppId | null;
  open: (id: AppId, args?: Record<string, string>) => void;
  focus: (id: AppId) => void;
  close: (id: AppId) => void;
  minimize: (id: AppId) => void;
  toggleMaximize: (id: AppId) => void;
  setPhase: (id: AppId, phase: WindowState['phase']) => void;
  remove: (id: AppId) => void;
  setRect: (id: AppId, rect: Rect) => void;
  closeAll: () => void;
  /** Last app that was launched — drives the Dock bounce. */
}

const Ctx = createContext<WM | null>(null);

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { windows: [], topZ: 10, opened: 0 });

  const focusedId = useMemo(() => {
    const visible = state.windows.filter((w) => w.phase !== 'minimized' && w.phase !== 'minimizing' && w.phase !== 'closing');
    if (!visible.length) return null;
    return visible.reduce((a, b) => (b.z > a.z ? b : a)).id;
  }, [state.windows]);

  const open = useCallback((id: AppId, args?: Record<string, string>) => dispatch({ type: 'open', id, args }), []);
  const focus = useCallback((id: AppId) => dispatch({ type: 'focus', id }), []);
  const close = useCallback((id: AppId) => dispatch({ type: 'phase', id, phase: 'closing' }), []);
  const minimize = useCallback((id: AppId) => dispatch({ type: 'phase', id, phase: 'minimizing' }), []);
  const toggleMaximize = useCallback((id: AppId) => dispatch({ type: 'toggleMax', id }), []);
  const setPhase = useCallback((id: AppId, phase: WindowState['phase']) => dispatch({ type: 'phase', id, phase }), []);
  const remove = useCallback((id: AppId) => dispatch({ type: 'remove', id }), []);
  const setRect = useCallback((id: AppId, rect: Rect) => dispatch({ type: 'rect', id, rect }), []);
  const closeAll = useCallback(() => dispatch({ type: 'closeAll' }), []);

  const value = useMemo<WM>(
    () => ({ windows: state.windows, focusedId, open, focus, close, minimize, toggleMaximize, setPhase, remove, setRect, closeAll }),
    [state.windows, focusedId, open, focus, close, minimize, toggleMaximize, setPhase, remove, setRect, closeAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWM(): WM {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWM must be used inside WindowManagerProvider');
  return ctx;
}
