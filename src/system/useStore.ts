import { useCallback, useEffect, useRef, useState } from 'react';
import { readStore, writeStore } from './storage';

/**
 * v8 — persisted state for visitor-created content (notes, mail, chats…).
 * Stored in this browser only; syncs between components using the same key.
 */
const EVT = 'mra-store-change';

export function usePersisted<T>(key: string, seed: T | (() => T)): [T, (u: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    const init = typeof seed === 'function' ? (seed as () => T)() : seed;
    const st = readStore<{ v: T | null }>(key, { v: null });
    return st.v ?? init;
  });
  const ref = useRef(val);
  ref.current = val;
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ key: string; v: unknown }>).detail;
      if (d?.key === key && d.v !== ref.current) setVal(d.v as T);
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, [key]);
  const set = useCallback(
    (u: T | ((prev: T) => T)) => {
      const next = typeof u === 'function' ? (u as (p: T) => T)(ref.current) : u;
      ref.current = next;
      setVal(next);
      writeStore(key, { v: next });
      window.dispatchEvent(new CustomEvent(EVT, { detail: { key, v: next } }));
    },
    [key],
  );
  return [val, set];
}

export const uid = (p = 'id') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function fmtWhen(t: number): string {
  const d = new Date(t);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  if (now.getTime() - t < 6 * 86400000) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}
