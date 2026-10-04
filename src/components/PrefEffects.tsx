import { useEffect, useRef } from 'react';
import { usePrefChoice, usePrefFlag, getChoice, getFlag } from '../system/prefs';
import { useWM } from '../system/WindowManager';
import { useSystem } from '../system/SystemContext';
import type { AppId } from '../system/types';

/** v10.3 — colours offered for "Text highlight color" (Settings → Appearance) */
export const HIGHLIGHTS: [string, string, string][] = [
  ['auto', 'Automatic', ''],
  ['blue', 'Blue', '#0a84ff'],
  ['purple', 'Purple', '#bf5af2'],
  ['pink', 'Pink', '#ff375f'],
  ['red', 'Red', '#ff453a'],
  ['orange', 'Orange', '#ff9f0a'],
  ['yellow', 'Yellow', '#ffd60a'],
  ['green', 'Green', '#30d158'],
  ['graphite', 'Graphite', '#8e8e93'],
];
/** v10.3 — apps that can open at login (Settings → General → Login Items) */
export const LOGIN_APPS: AppId[] = ['about', 'hireme', 'notes', 'reminders', 'music', 'guidebook'];

/**
 * v10.3 — applies the Mac System Settings switches that affect the whole
 * portfolio, so none of them is decorative:
 *  · Text highlight colour  · Keyboard navigation focus rings  · Paper size for printing
 *  · Assistant keyboard shortcut (⌥ Space)  · Login items (open apps after start-up)
 */
export function PrefEffects() {
  const hl = usePrefChoice('highlight', 'auto');
  const kbNav = usePrefFlag('kb-nav', true);
  const paper = usePrefChoice('paper', 'a4');
  const wm = useWM();
  const sys = useSystem();
  const wmRef = useRef(wm);
  wmRef.current = wm;

  useEffect(() => {
    const c = HIGHLIGHTS.find((h) => h[0] === hl)?.[2] ?? '';
    const root = document.documentElement;
    if (c) {
      root.dataset.hl = hl;
      root.style.setProperty('--hl-color', c);
    } else {
      delete root.dataset.hl;
      root.style.removeProperty('--hl-color');
    }
  }, [hl]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-kbnav', kbNav);
  }, [kbNav]);

  useEffect(() => {
    let el = document.getElementById('mra-paper') as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = 'mra-paper';
      document.head.appendChild(el);
    }
    el.textContent = `@page { size: ${paper === 'letter' ? 'letter' : 'A4'}; margin: 14mm; }`;
  }, [paper]);

  // Assistant: ⌥ Space opens it (Settings → Assistant → Keyboard shortcut)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!e.altKey || e.code !== 'Space' || e.metaKey || e.ctrlKey) return;
      if (getChoice('siri-key', 'opt-space') !== 'opt-space' || !getFlag('siri-on', true)) return;
      e.preventDefault();
      wmRef.current.open('siri');
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  // Login items: open the chosen apps once per visit, after the Mac desktop is ready and unlocked
  useEffect(() => {
    if (document.documentElement.dataset.device !== 'mac') return;
    if (sys.phase !== 'ready' || sys.locked) return;
    try {
      if (sessionStorage.getItem('mra-login-items')) return;
      sessionStorage.setItem('mra-login-items', '1');
    } catch {
      return;
    }
    const list = LOGIN_APPS.filter((a) => getFlag(`login-${a}`, false));
    list.forEach((a, i) => window.setTimeout(() => wmRef.current.open(a), 900 + i * 350));
  }, [sys.phase, sys.locked]);

  return null;
}
