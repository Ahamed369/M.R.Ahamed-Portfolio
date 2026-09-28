import { useCallback, useEffect, useState } from 'react';
import { readStore, writeStore } from './storage';
import { personal } from '../data/portfolio';
import type { AppId } from './types';

export interface Reminder {
  id: string;
  text: string;
  done: boolean;
  list: string;
  flagged?: boolean;
  /** optional app to open from the reminder */
  app?: AppId;
  /** optional free-text notes */
  notes?: string;
  /** due date YYYY-MM-DD */
  due?: string;
  /** due time HH:MM (only with due) */
  time?: string;
  /** 0 none · 1 low · 2 medium · 3 high */
  priority?: number;
}

export interface ReminderList {
  id: string;
  label: string;
  color: string;
  /** created by the visitor */
  user?: boolean;
}

export const LISTS: ReminderList[] = [
  { id: 'explore', label: 'Explore the Portfolio', color: '#0a84ff' },
  { id: 'newapps', label: 'Try the New Apps', color: '#af52de' },
  { id: 'contact', label: 'Get in Touch', color: '#34c759' },
  { id: 'mine', label: 'My Reminders', color: '#ff9f0a' },
];

const pad = (n: number) => String(n).padStart(2, '0');
/** Local date as YYYY-MM-DD. */
export const isoDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = isoDay();

/** Starter checklist for visitors — a guided tour of the portfolio. */
export const SEED: Reminder[] = [
  { id: 'r1', text: 'Read About Me', done: false, list: 'explore', app: 'about', due: TODAY },
  { id: 'r2', text: 'Browse my projects in Xcode', done: false, list: 'explore', app: 'xcode', flagged: true, priority: 3 },
  { id: 'r3', text: 'See my skills (with project evidence) in Notes', done: false, list: 'explore', app: 'notes' },
  { id: 'r4', text: 'Open the Experience folder', done: false, list: 'explore', app: 'finder' },
  { id: 'r5', text: 'Flip through the Achievements deck', done: false, list: 'explore', app: 'slides' },
  { id: 'r6', text: 'Download my CV', done: false, list: 'contact', app: 'preview', flagged: true, due: TODAY, priority: 2 },
  { id: 'r7', text: `Email ${personal.name}`, done: false, list: 'contact', app: 'mail' },
  { id: 'r8', text: 'Send a text via Messages', done: false, list: 'contact', app: 'messages' },
  { id: 'n1', text: 'Play a round in Game Center', done: false, list: 'newapps', app: 'gamecenter', notes: 'Small browser games — scores stay on this device.' },
  { id: 'n2', text: 'Take a selfie with Camera', done: false, list: 'newapps', app: 'camera', notes: 'Photos never leave your browser.' },
  { id: 'n3', text: 'Sketch an idea on a Freeform board', done: false, list: 'newapps', app: 'freeform' },
  { id: 'n4', text: 'Ask Siri about my projects', done: false, list: 'newapps', app: 'siri' },
  { id: 'n5', text: 'Write an entry in Journal', done: false, list: 'newapps', app: 'journal' },
  { id: 'n6', text: 'Watch a portfolio walkthrough in TV', done: false, list: 'newapps', app: 'tv' },
  { id: 'n7', text: 'Browse the shelf in Books', done: false, list: 'newapps', app: 'books' },
  { id: 'n8', text: 'Look up a tech term in Dictionary', done: false, list: 'newapps', app: 'dictionary' },
];

const KEY = 'mra-reminders-v1';
const LKEY = 'mra-reminder-lists-v7';
const EVT = 'mra-reminders-change';
const SEED_VERSION = 2;

/* In-memory copy so the widget and the app stay in sync even when localStorage is unavailable. */
let cache: Reminder[] | null = null;
const load = (): Reminder[] => {
  if (cache) return cache;
  const st = readStore<{ items: Reminder[]; v?: number }>(KEY, { items: SEED, v: 0 });
  let items = Array.isArray(st.items) ? st.items : SEED;
  // returning visitors get newly added guide reminders once
  if ((st.v ?? 0) < SEED_VERSION) {
    const have = new Set(items.map((i) => i.id));
    items = [...items, ...SEED.filter((s) => !have.has(s.id))];
    writeStore(KEY, { items, v: SEED_VERSION });
  }
  cache = items;
  return items;
};

function save(items: Reminder[]) {
  cache = items;
  writeStore(KEY, { items, v: SEED_VERSION });
  window.dispatchEvent(new Event(EVT));
}

/** Shared reminders list used by both the Reminders app and the desktop widget. */
export function useReminders(): [Reminder[], (u: Reminder[] | ((prev: Reminder[]) => Reminder[])) => void] {
  const [items, setState] = useState<Reminder[]>(load);

  useEffect(() => {
    const sync = () => setState(load());
    const fromOtherTab = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      cache = null;
      sync();
    };
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', fromOtherTab);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener('storage', fromOtherTab);
    };
  }, []);

  const setItems = useCallback((u: Reminder[] | ((prev: Reminder[]) => Reminder[])) => {
    const next = typeof u === 'function' ? u(load()) : u;
    save(next);
  }, []);

  return [items, setItems];
}

/* ── Visitor-created lists (persisted) ── */
let listCache: ReminderList[] | null = null;
const loadLists = (): ReminderList[] => (listCache ??= readStore<{ lists: ReminderList[] }>(LKEY, { lists: [] }).lists);

/** Built-in lists followed by the visitor's own lists. */
export function useReminderLists(): [ReminderList[], (u: (prev: ReminderList[]) => ReminderList[]) => void] {
  const [user, setUser] = useState<ReminderList[]>(loadLists);
  useEffect(() => {
    const sync = () => setUser(loadLists());
    window.addEventListener(EVT + '-lists', sync);
    return () => window.removeEventListener(EVT + '-lists', sync);
  }, []);
  const set = useCallback((u: (prev: ReminderList[]) => ReminderList[]) => {
    listCache = u(loadLists());
    writeStore(LKEY, { lists: listCache });
    window.dispatchEvent(new Event(EVT + '-lists'));
  }, []);
  return [[...LISTS, ...user], set];
}

/** Colour for any list id (built-in or visitor list). */
export const listColor = (id: string) => LISTS.find((l) => l.id === id)?.color ?? loadLists().find((l) => l.id === id)?.color ?? '#8e8e93';
