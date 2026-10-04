import { useEffect, useState } from 'react';
import { readStore, writeStore } from './storage';
import type { AppId } from './types';

/**
 * v10 — Desktops (Spaces), like macOS Mission Control.
 * Each desktop has its own windows and its own wallpaper; desktop icons and
 * widgets are shared by all desktops (as on a real Mac).
 */
export interface SpacesState {
  count: number;
  current: number;
  /** which desktop each open window lives on */
  win: Partial<Record<AppId, number>>;
  /** wallpaper per desktop (index 0 uses Settings → Wallpaper) */
  wallpapers: Record<number, string>;
}

const KEY = 'mra-spaces-v10';
const EVT = 'mra-spaces';
export const MAX_SPACES = 6;
const DEFAULT_WALLS: Record<number, string> = { 1: 'tahoe', 2: 'aurora', 3: 'mesh-ocean', 4: 'northern-lights', 5: 'dune-dusk' };

let st: SpacesState = (() => {
  const s = readStore<SpacesState>(KEY, { count: 3, current: 0, win: {}, wallpapers: {} });
  return { count: Math.max(1, Math.min(MAX_SPACES, s.count || 3)), current: 0, win: {}, wallpapers: s.wallpapers ?? {} };
})();

function save(next: SpacesState) {
  st = next;
  writeStore(KEY, { count: st.count, current: 0, win: {}, wallpapers: st.wallpapers });
  window.dispatchEvent(new Event(EVT));
}

export const getSpaces = () => st;

export function useSpaces(): SpacesState {
  const [s, set] = useState(st);
  useEffect(() => {
    const on = () => set(st);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return s;
}

export function spaceWallpaper(i: number, mainWallpaper: string): string {
  return i === 0 ? mainWallpaper : (st.wallpapers[i] ?? DEFAULT_WALLS[i] ?? mainWallpaper);
}

export function setSpaceWallpaper(i: number, id: string) {
  save({ ...st, wallpapers: { ...st.wallpapers, [i]: id } });
}

export function setSpaceCount(n: number) {
  const count = Math.max(1, Math.min(MAX_SPACES, n));
  // windows on removed desktops move to the last remaining one
  const win = { ...st.win };
  (Object.keys(win) as AppId[]).forEach((id) => {
    if ((win[id] ?? 0) >= count) win[id] = count - 1;
  });
  save({ ...st, count, win, current: Math.min(st.current, count - 1) });
}

/** dir: -1 / +1 relative switch, or absolute index via `to` */
export function switchSpace(to: number) {
  const next = Math.max(0, Math.min(st.count - 1, to));
  if (next === st.current) {
    window.dispatchEvent(new CustomEvent('mra-space-bump', { detail: to > st.current ? 1 : -1 }));
    return;
  }
  const dir = next > st.current ? 1 : -1;
  window.dispatchEvent(new CustomEvent('mra-space-switch', { detail: { from: st.current, to: next, dir } }));
  save({ ...st, current: next });
}

export function assignWindow(id: AppId, space?: number) {
  if (st.win[id] !== undefined && space === undefined) return;
  save({ ...st, win: { ...st.win, [id]: space ?? st.current } });
}

export function forgetWindow(id: AppId) {
  if (st.win[id] === undefined) return;
  const win = { ...st.win };
  delete win[id];
  st = { ...st, win };
  window.dispatchEvent(new Event(EVT));
}

export function windowSpace(id: AppId): number {
  return st.win[id] ?? 0;
}
