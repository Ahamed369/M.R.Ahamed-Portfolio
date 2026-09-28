import { useEffect, useState } from 'react';
import { readStore, writeStore } from './storage';
import type { AppId } from './types';

/**
 * Real Screen Time for this portfolio: how long each app has been the
 * focused window today, how many times apps were opened, and a
 * recently-used list (for  → Recent Items). Stored on this device only.
 */
export interface ScreenTimeData {
  /** YYYY-MM-DD (local) the numbers belong to */
  day: string;
  /** ms of focused use per app today */
  perApp: Partial<Record<AppId, number>>;
  /** ms the portfolio tab was visible today (any app or desktop) */
  total: number;
  /** app launches today */
  opens: number;
  /** per-hour visible ms today (24 entries) */
  hours: number[];
  /** most-recent-first list of opened apps (kept across days) */
  recent: AppId[];
}

const KEY = 'mra-screen-time-v1';
/** v9 — previous days (for Screen Time date filtering and Battery → Screen On Usage) */
const HIST_KEY = 'mra-screen-time-hist-v9';
export interface DayUsage {
  perApp: Partial<Record<AppId, number>>;
  total: number;
  opens: number;
  hours: number[];
}
let history: Record<string, DayUsage> = readStore<Record<string, DayUsage>>(HIST_KEY, {});
function archive(d: ScreenTimeData) {
  if (!d.total && !d.opens) return;
  history = { ...history, [d.day]: { perApp: d.perApp, total: d.total, opens: d.opens, hours: d.hours } };
  // keep the last 60 days
  const keys = Object.keys(history).sort();
  keys.slice(0, Math.max(0, keys.length - 60)).forEach((k) => delete history[k]);
  writeStore(HIST_KEY, history);
}
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Usage for any day: live numbers for today, archived numbers for earlier days. */
export function usageFor(key: string): DayUsage | null {
  if (key === data.day) return { perApp: data.perApp, total: data.total, opens: data.opens, hours: data.hours };
  return history[key] ?? null;
}
const EVT = 'mra-screen-time';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fresh = (recent: AppId[] = []): ScreenTimeData => ({ day: today(), perApp: {}, total: 0, opens: 0, hours: Array(24).fill(0), recent });

let data: ScreenTimeData = (() => {
  const d = readStore<ScreenTimeData>(KEY, fresh());
  if (d.day === today() && Array.isArray(d.hours) && d.hours.length === 24) return d;
  if (d.day && Array.isArray(d.hours)) archive(d);
  return fresh(d.recent ?? []);
})();

let lastSave = 0;
function commit(force = false) {
  const now = Date.now();
  if (force || now - lastSave > 5000) {
    lastSave = now;
    writeStore(KEY, data);
  }
  window.dispatchEvent(new Event(EVT));
}

function rollDay() {
  if (data.day !== today()) {
    archive(data);
    data = fresh(data.recent);
  }
}

/** Called by the tracker once per second with the focused app (or null for the desktop). */
export function tickScreenTime(focused: AppId | null, ms: number) {
  rollDay();
  data.total += ms;
  data.hours[new Date().getHours()] += ms;
  if (focused) data.perApp[focused] = (data.perApp[focused] ?? 0) + ms;
  commit();
}

/** Called when an app window is opened. */
export function recordOpen(id: AppId) {
  rollDay();
  data.opens += 1;
  data.recent = [id, ...data.recent.filter((x) => x !== id)].slice(0, 10);
  commit(true);
}

export function getScreenTime(): ScreenTimeData {
  return data;
}

/** Live Screen Time numbers (re-renders about once a second while visible). */
export function useScreenTime(): ScreenTimeData {
  const [snap, setSnap] = useState<ScreenTimeData>(() => ({ ...data }));
  useEffect(() => {
    const on = () => setSnap({ ...data, perApp: { ...data.perApp }, hours: [...data.hours], recent: [...data.recent] });
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return snap;
}

export function fmtDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return `${Math.max(0, Math.round(ms / 1000))}s`;
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}
