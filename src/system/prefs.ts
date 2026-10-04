import { useEffect, useState } from 'react';
import { readStore } from './storage';

/**
 * v10.3 — read the Mac System Settings "prefs" (flags and choices kept by the
 * Settings app in 'mra-settings-app-v5') from anywhere in the portfolio, so the
 * switches in Settings really change things. The Settings app fires
 * PREFS_EVT whenever one of them changes.
 */
export const PREFS_KEY = 'mra-settings-app-v5';
export const PREFS_EVT = 'mra-prefs';
interface Prefs {
  flags: Record<string, boolean>;
  choices: Record<string, string>;
}
const read = () => readStore<Prefs>(PREFS_KEY, { flags: {}, choices: {} });
export const getFlag = (k: string, d: boolean) => read().flags?.[k] ?? d;
export const getChoice = (k: string, d: string) => read().choices?.[k] ?? d;

export function usePrefFlag(k: string, d: boolean) {
  const [v, setV] = useState(() => getFlag(k, d));
  useEffect(() => {
    const on = () => setV(getFlag(k, d));
    window.addEventListener(PREFS_EVT, on);
    return () => window.removeEventListener(PREFS_EVT, on);
  }, [k, d]);
  return v;
}
export function usePrefChoice(k: string, d: string) {
  const [v, setV] = useState(() => getChoice(k, d));
  useEffect(() => {
    const on = () => setV(getChoice(k, d));
    window.addEventListener(PREFS_EVT, on);
    return () => window.removeEventListener(PREFS_EVT, on);
  }, [k, d]);
  return v;
}
