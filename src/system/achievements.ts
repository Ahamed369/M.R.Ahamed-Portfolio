import { useEffect, useState } from 'react';
import { readStore, writeStore } from './storage';
import { notify } from './notify';

/**
 * v10.1 — hidden achievements: small badges for exploring the portfolio.
 * Stored only in this browser; switch off in Settings.
 */
export const ACHIEVEMENTS: { id: string; title: string; hint: string; glyph: string }[] = [
  { id: 'explorer', title: 'Explorer', hint: 'Open 10 different apps', glyph: '🧭' },
  { id: 'everything', title: 'Seen it all', hint: 'Open 30 different apps', glyph: '🏆' },
  { id: 'cv', title: 'Did your homework', hint: 'Open the CV', glyph: '📄' },
  { id: 'hire', title: 'Let’s talk', hint: 'Open Hire Me', glyph: '🤝' },
  { id: 'night', title: 'Night owl', hint: 'Visit between midnight and 4 am', glyph: '🦉' },
  { id: 'konami', title: 'Old-school gamer', hint: '↑ ↑ ↓ ↓ ← → ← → B A', glyph: '🎮' },
  { id: 'undo', title: 'Time traveller', hint: 'Undo something', glyph: '↶' },
  { id: 'dark', title: 'Dark side', hint: 'Switch to Dark Mode', glyph: '🌙' },
];
const KEY = 'mra-achiev-v10';
const OPEN_KEY = 'mra-achiev-opened-v10';
const EVT = 'mra-achiev';
let enabled = true;
export const setAchievementsEnabled = (on: boolean) => {
  enabled = on;
};

export function unlocked(): Record<string, number> {
  return readStore<Record<string, number>>(KEY, {});
}

export function unlock(id: string) {
  if (!enabled) return;
  const u = unlocked();
  if (u[id]) return;
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) return;
  writeStore(KEY, { ...u, [id]: Date.now() });
  window.dispatchEvent(new Event(EVT));
  notify({ app: 'Game Center', icon: 'gamecenter', title: `${a.glyph} Achievement unlocked`, body: `${a.title} — ${a.hint}` });
}

export function trackOpen(app: string) {
  if (!enabled) return;
  const seen = new Set(readStore<{ ids: string[] }>(OPEN_KEY, { ids: [] }).ids ?? []);
  seen.add(app);
  writeStore(OPEN_KEY, { ids: [...seen] });
  if (seen.size >= 10) unlock('explorer');
  if (seen.size >= 30) unlock('everything');
  if (app === 'preview') unlock('cv');
  if (app === 'hireme') unlock('hire');
  const h = new Date().getHours();
  if (h < 4) unlock('night');
}

let konami: string[] = [];
const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let keysOn = false;
export function startAchievementKeys() {
  if (keysOn) return;
  keysOn = true;
  window.addEventListener('keydown', (e) => {
    konami = [...konami, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-SEQ.length);
    if (konami.join() === SEQ.join()) unlock('konami');
  });
}

export function useAchievements(): Record<string, number> {
  const [u, setU] = useState(unlocked);
  useEffect(() => {
    const on = () => setU(unlocked());
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return u;
}
