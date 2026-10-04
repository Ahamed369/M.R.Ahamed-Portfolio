import { idbGet, idbSet } from './idb';

/**
 * v10.1 — Time Machine: hourly snapshots of everything you created in the
 * portfolio (notes, messages, layouts, settings…) kept in this browser's
 * IndexedDB. Restore any snapshot from the Time Machine app.
 */
export interface TMSnapshot {
  at: number;
  data: Record<string, string>;
  count: number;
  bytes: number;
  manual?: boolean;
}
const KEY = 'tm-snapshots';
const MAX = 24;
const HOUR = 60 * 60 * 1000;

export function currentData(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('mra-')) out[k] = localStorage.getItem(k) ?? '';
    }
  } catch {
    /* storage blocked */
  }
  return out;
}

export async function listSnapshots(): Promise<TMSnapshot[]> {
  return (await idbGet<TMSnapshot[]>(KEY)) ?? [];
}

const same = (a: Record<string, string>, b: Record<string, string>) => {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => a[k] === b[k]);
};

/** take a snapshot (skipped when nothing changed since the last one, unless forced) */
export async function backUpNow(manual = false): Promise<TMSnapshot | null> {
  const data = currentData();
  const list = await listSnapshots();
  if (list[0] && same(list[0].data, data) && !manual) return null;
  const bytes = Object.entries(data).reduce((n, [k, v]) => n + k.length + v.length, 0);
  if (bytes > 4_000_000) return null;
  const snap: TMSnapshot = { at: Date.now(), data, count: Object.keys(data).length, bytes, manual };
  await idbSet(KEY, [snap, ...list].slice(0, MAX));
  window.dispatchEvent(new Event('mra-tm'));
  return snap;
}

export async function deleteSnapshot(at: number) {
  await idbSet(KEY, (await listSnapshots()).filter((s) => s.at !== at));
  window.dispatchEvent(new Event('mra-tm'));
}

export function restoreSnapshot(s: TMSnapshot) {
  try {
    const now = currentData();
    Object.keys(now).forEach((k) => !(k in s.data) && localStorage.removeItem(k));
    Object.entries(s.data).forEach(([k, v]) => localStorage.setItem(k, v));
  } catch {
    /* ignore */
  }
  window.setTimeout(() => location.reload(), 200);
}

let started = false;
/** automatic hourly backups while the portfolio is open */
export function startAutoBackup() {
  if (started) return;
  started = true;
  const tick = async () => {
    const list = await listSnapshots();
    if (!list[0] || Date.now() - list[0].at >= HOUR) await backUpNow();
  };
  window.setTimeout(() => void tick(), 15000);
  window.setInterval(() => void tick(), 5 * 60 * 1000);
}

/** a friendly name for a storage key */
export function keyLabel(k: string): string {
  const s = k.replace(/^mra-/, '').replace(/-v\d+$/, '').replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
