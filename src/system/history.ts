import { useEffect, useState } from 'react';
import { readStore, setWriteHook, writeStore } from './storage';
import { notify } from './notify';
import { unlock } from './achievements';

/**
 * v10 — global Undo / Redo and Recently Deleted.
 *
 * Every app saves visitor content through writeStore(). This module watches
 * those writes: each change can be undone (⌘Z / Ctrl+Z, shake or three-finger
 * double-tap on touch) and redone (⇧⌘Z / Ctrl+Y), and any item that
 * disappears from a saved list goes to the Trash / Recently Deleted, from
 * where it can be put back. Nothing leaves this browser.
 */

/** system keys that are not visitor content */
const SKIP = /(settings|screen-?time|battery|spaces|badge|account|music|boot|session|lang|perf|trash|deleted-v10|undo|seen|tour|achiev|layout-v10|ios-|customize|calendar-cals|weather|wallpaper|dock|desk|widget|window|icon|stage|recent|notif|last|-pos|cam|history|analytics|gh-cache|github|tabs)/i;

interface Change {
  key: string;
  before: string | null;
  after: string;
  at: number;
  label: string;
}
export interface DeletedItem {
  id: string;
  key: string;
  /** path of the array inside the stored value ('' = the value itself) */
  path: string;
  item: unknown;
  title: string;
  app: string;
  at: number;
}

const DKEY = 'mra-deleted-v10';
const DEVT = 'mra-deleted-change';
const undo: Change[] = [];
const redo: Change[] = [];
let applying = false;
let limit = 50;

export function setUndoLimit(n: number) {
  limit = Math.max(5, Math.min(200, n));
}

const APP_OF: [RegExp, string][] = [
  [/note/i, 'Notes'],
  [/remind/i, 'Reminders'],
  [/calendar/i, 'Calendar'],
  [/freeform/i, 'Freeform'],
  [/journal/i, 'Journal'],
  [/sticky|stickies/i, 'Stickies'],
  [/mail/i, 'Mail'],
  [/chat|message|whatsapp|telegram/i, 'Messages'],
  [/contact/i, 'Contacts'],
  [/photo/i, 'Photos'],
  [/guest/i, 'Guestbook'],
  [/memo|voice/i, 'Voice Memos'],
  [/pages|doc/i, 'Pages'],
  [/x-|xapp|tweet/i, 'X'],
  [/wallet/i, 'Wallet'],
  [/terminal/i, 'Terminal'],
];
const appFor = (key: string) => APP_OF.find(([r]) => r.test(key))?.[1] ?? 'Portfolio';

function titleOf(it: unknown): string {
  if (typeof it === 'string') return it.slice(0, 60);
  if (!it || typeof it !== 'object') return 'Item';
  const o = it as Record<string, unknown>;
  for (const k of ['title', 'name', 'subject', 'text', 'label', 'body', 'content', 'msg', 'message']) {
    if (typeof o[k] === 'string' && (o[k] as string).trim()) return (o[k] as string).replace(/<[^>]+>/g, '').slice(0, 60);
  }
  return 'Item';
}
const idOf = (it: unknown) => (it && typeof it === 'object' && 'id' in (it as object) ? String((it as { id: unknown }).id) : JSON.stringify(it));

/** list arrays inside a stored value: '' for a top-level array, 'field' or 'v' / 'v.field' one or two levels deep */
function arrays(v: unknown, prefix = '', depth = 0): Map<string, unknown[]> {
  const out = new Map<string, unknown[]>();
  if (Array.isArray(v)) out.set(prefix, v);
  else if (v && typeof v === 'object' && depth < 2)
    Object.entries(v as Record<string, unknown>).forEach(([k, x]) => arrays(x, prefix ? `${prefix}.${k}` : k, depth + 1).forEach((a, p) => out.set(p, a)));
  return out;
}

function readDeleted(): DeletedItem[] {
  return readStore<{ items: DeletedItem[] }>(DKEY, { items: [] }).items;
}
function saveDeleted(items: DeletedItem[]) {
  writeStore(DKEY, { items: items.slice(0, 300) });
  window.dispatchEvent(new Event(DEVT));
}

function detectDeleted(key: string, before: string | null, after: string) {
  if (!before) return;
  let a: unknown;
  let b: unknown;
  try {
    a = JSON.parse(before);
    b = JSON.parse(after);
  } catch {
    return;
  }
  const prev = arrays(a);
  const next = arrays(b);
  const found: DeletedItem[] = [];
  prev.forEach((list, path) => {
    const now = next.get(path);
    if (!now) return;
    const keep = new Set(now.map(idOf));
    list.forEach((it) => {
      if (!keep.has(idOf(it)) && it && typeof it === 'object') found.push({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, key, path, item: it, title: titleOf(it), app: appFor(key), at: Date.now() });
    });
  });
  if (found.length && found.length <= 40) saveDeleted([...found, ...readDeleted()]);
}

let lastLabel = '';
setWriteHook((key, before, after) => {
  if (applying || SKIP.test(key) || key === DKEY) return;
  const top = undo[undo.length - 1];
  const now = Date.now();
  let label = 'Change';
  try {
    const pa = before ? arrays(JSON.parse(before)) : new Map();
    const na = arrays(JSON.parse(after));
    let pc = 0;
    let nc = 0;
    pa.forEach((x) => (pc += x.length));
    na.forEach((x) => (nc += x.length));
    label = nc < pc ? 'Delete' : nc > pc ? 'Add' : 'Edit';
  } catch {
    /* not JSON */
  }
  label = `${label} · ${appFor(key)}`;
  if (top && top.key === key && now - top.at < 900 && top.label === label) {
    top.after = after;
    top.at = now;
  } else {
    undo.push({ key, before, after, at: now, label });
    if (undo.length > limit) undo.shift();
  }
  redo.length = 0;
  lastLabel = label;
  detectDeleted(key, before, after);
  window.dispatchEvent(new Event('mra-undo-change'));
});

/** after restoring a key, tell every kind of store to reload it */
function broadcast(key: string, raw: string | null) {
  try {
    const v = raw ? (JSON.parse(raw) as { v?: unknown }) : null;
    if (v && typeof v === 'object' && 'v' in v) window.dispatchEvent(new CustomEvent('mra-store-change', { detail: { key, v: v.v } }));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new StorageEvent('storage', { key }));
  } catch {
    /* old browsers */
  }
  window.dispatchEvent(new CustomEvent('mra-store-restored', { detail: key }));
}

function put(key: string, raw: string | null) {
  applying = true;
  try {
    if (raw === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, raw);
  } catch {
    /* ignore */
  }
  applying = false;
  broadcast(key, raw);
}

export const canUndo = () => undo.length > 0;
export const canRedo = () => redo.length > 0;
export const undoLabel = () => undo[undo.length - 1]?.label ?? '';
export const redoLabel = () => redo[redo.length - 1]?.label ?? '';
export const lastChange = () => lastLabel;

export function doUndo(): boolean {
  const c = undo.pop();
  if (!c) return false;
  redo.push(c);
  put(c.key, c.before);
  unlock('undo');
  notify({ app: 'Undo', icon: 'settings', title: `Undo ${c.label}`, body: 'Redo with ⇧⌘Z / Ctrl+Y', silent: true });
  window.dispatchEvent(new Event('mra-undo-change'));
  return true;
}
export function doRedo(): boolean {
  const c = redo.pop();
  if (!c) return false;
  undo.push(c);
  put(c.key, c.after);
  notify({ app: 'Redo', icon: 'settings', title: `Redo ${c.label}`, silent: true });
  window.dispatchEvent(new Event('mra-undo-change'));
  return true;
}

/* ───────── Recently Deleted ───────── */

export function useDeleted(): DeletedItem[] {
  const [items, set] = useState(readDeleted);
  useEffect(() => {
    const on = () => set(readDeleted());
    window.addEventListener(DEVT, on);
    return () => window.removeEventListener(DEVT, on);
  }, []);
  return items;
}

function getPath(root: unknown, path: string): unknown[] | null {
  if (!path) return Array.isArray(root) ? root : null;
  let cur: unknown = root;
  for (const k of path.split('.')) {
    if (!cur || typeof cur !== 'object') return null;
    cur = (cur as Record<string, unknown>)[k];
  }
  return Array.isArray(cur) ? cur : null;
}

/** Put an item back where it was. */
export function restoreDeleted(d: DeletedItem): boolean {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(d.key);
  } catch {
    raw = null;
  }
  let root: unknown;
  try {
    root = raw ? JSON.parse(raw) : null;
  } catch {
    root = null;
  }
  if (root === null) root = d.path ? {} : [];
  const list = getPath(root, d.path);
  if (!list) return false;
  if (!list.some((x) => idOf(x) === idOf(d.item))) list.unshift(d.item);
  const next = JSON.stringify(root);
  put(d.key, next);
  saveDeleted(readDeleted().filter((x) => x.id !== d.id));
  notify({ app: d.app, icon: 'trash', title: `“${d.title}” was put back`, body: `Restored to ${d.app}.`, silent: true });
  return true;
}

export function eraseDeleted(id?: string) {
  saveDeleted(id ? readDeleted().filter((x) => x.id !== id) : []);
}

/** Auto-empty items older than N days (Settings → Trash). */
export function purgeDeleted(days: number) {
  if (!days) return;
  const cut = Date.now() - days * 86400000;
  const all = readDeleted();
  const keep = all.filter((x) => x.at >= cut);
  if (keep.length !== all.length) saveDeleted(keep);
}
export const daysLeft = (d: DeletedItem, days: number) => Math.max(0, Math.ceil((d.at + (days || 30) * 86400000 - Date.now()) / 86400000));

/** Keyboard: ⌘Z / Ctrl+Z undo, ⇧⌘Z / Ctrl+Y redo — text fields keep their own undo. */
export function installUndoKeys(): () => void {
  const on = (e: KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) {
      if (doUndo()) e.preventDefault();
    } else if ((k === 'z' && e.shiftKey) || (k === 'y' && e.ctrlKey)) {
      if (doRedo()) e.preventDefault();
    }
  };
  window.addEventListener('keydown', on);
  return () => window.removeEventListener('keydown', on);
}

/** Apps that keep their own copy of saved data re-read it after an undo / put back. */
export function useRestoreEpoch(): number {
  const [n, set] = useState(0);
  useEffect(() => {
    const on = () => set((x) => x + 1);
    window.addEventListener('mra-store-restored', on);
    return () => window.removeEventListener('mra-store-restored', on);
  }, []);
  return n;
}
