/**
 * v8 — App icon badges (the red circle with a white number).
 * A tiny persisted store: apps call setBadge(id, n) / clearBadge(id);
 * the Dock, Launchpad and app sidebars read useBadges(). Reminders is
 * always the number of pending reminders, like macOS.
 */
import { useEffect, useMemo, useState } from 'react';
import { readStore, writeStore } from './storage';
import { useReminders } from './reminders';

const KEY = 'mra-badges-v8';
const EVT = 'mra-badges-change';

/** First-visit unread counts — each matches real unread content in that app. */
const SEED: Record<string, number> = {
  messages: 2,
  mail: 2,
  whatsapp: 1,
  telegram: 1,
  yahoomail: 2,
  guestbook: 0,
  gamecenter: 1,
  xapp: 0,
};

let cache: Record<string, number> | null = null;
const load = () => (cache ??= { ...SEED, ...readStore<Record<string, number>>(KEY, {}) });

export function getBadge(id: string): number {
  return load()[id] ?? 0;
}

export function setBadge(id: string, n: number): void {
  const cur = load();
  const v = Math.max(0, Math.round(n));
  if ((cur[id] ?? 0) === v) return;
  cache = { ...cur, [id]: v };
  writeStore(KEY, cache);
  window.dispatchEvent(new Event(EVT));
}

export const clearBadge = (id: string) => setBadge(id, 0);
export const bumpBadge = (id: string, by = 1) => setBadge(id, getBadge(id) + by);

export function useBadges(): Record<string, number> {
  const [b, setB] = useState(load);
  const [reminders] = useReminders();
  useEffect(() => {
    const on = () => setB({ ...load() });
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  const pending = reminders.filter((r) => !r.done).length;
  return useMemo(() => ({ ...b, reminders: pending }), [b, pending]);
}

export function badgeText(n: number): string {
  return n > 99 ? '99+' : String(n);
}

/** Apps whose badge clears when the visitor opens them (Reminders keeps its count). */
export const CLEAR_ON_OPEN = new Set(['messages', 'mail', 'whatsapp', 'telegram', 'yahoomail', 'gamecenter', 'xapp', 'guestbook']);
