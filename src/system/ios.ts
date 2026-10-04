import { useEffect, useState } from 'react';
import { LAUNCH_ITEMS, type LaunchItem } from './launch';
import { readStore, writeStore } from './storage';
import type { Settings } from './types';

/* ───────────────────────── device mode ───────────────────────── */

export type DeviceMode = 'mac' | 'iphone' | 'ipad';

export const isEmbedded = (() => {
  try {
    return new URLSearchParams(location.search).get('embed') === '1';
  } catch {
    return false;
  }
})();

function urlView(): DeviceMode | null {
  try {
    const v = new URLSearchParams(location.search).get('view');
    return v === 'mac' || v === 'iphone' || v === 'ipad' ? v : null;
  } catch {
    return null;
  }
}

/** choose a device: forget a ?view= in the address (except inside the embedded device view) and save the choice */
export function chooseView(update: (p: Partial<Settings>) => void, v: Settings['viewAs']) {
  if (!isEmbedded) {
    try {
      const u = new URL(location.href);
      if (u.searchParams.has('view')) {
        u.searchParams.delete('view');
        history.replaceState(null, '', u.toString());
      }
    } catch {
      /* ignore */
    }
  }
  update({ viewAs: v });
  window.setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
}

export function detectMode(viewAs: Settings['viewAs'] | undefined): DeviceMode {
  const u = urlView();
  if (u) return u;
  if (viewAs && viewAs !== 'auto') return viewAs;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const short = Math.min(w, h);
  let coarse = false;
  try {
    coarse = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches;
  } catch {
    coarse = false;
  }
  if (w < 700 || (coarse && short < 600)) return 'iphone';
  // iPadOS Safari reports a desktop user agent; a touch-only device with a tablet-sized screen is treated as an iPad
  const touchMac = /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
  if ((coarse || touchMac) && short < 1100) return 'ipad';
  return 'mac';
}

export function useDeviceMode(viewAs: Settings['viewAs'] | undefined): DeviceMode {
  const [m, setM] = useState(() => detectMode(viewAs));
  useEffect(() => {
    let f = 0;
    const on = () => {
      cancelAnimationFrame(f);
      f = requestAnimationFrame(() => setM(detectMode(viewAs)));
    };
    on();
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('resize', on);
      cancelAnimationFrame(f);
    };
  }, [viewAs]);
  return m;
}

/** the viewport is larger than the chosen device → show the device in a frame */

export function framedSize(mode: DeviceMode): { w: number; h: number } | null {
  if (isEmbedded) return null;
  const W = window.innerWidth;
  const H = window.innerHeight;
  if (mode === 'iphone') return W >= 700 && H >= 640 ? fit(402, 874, W, H) : null;
  let fine = false;
  try {
    fine = window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(pointer: coarse)').matches;
  } catch {
    fine = false;
  }
  if (mode === 'ipad') return (W >= 1320 && H >= 940) || (fine && W >= 700) ? fit(1180, 820, W, H) : null;
  return null;
}
function fit(w: number, h: number, W: number, H: number) {
  const s = Math.min(1, (H - 60) / h, (W - 60) / w);
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

/* ───────────────────────── catalogue ───────────────────────── */

/** one entry per launchable item (Launchpad duplicates removed) */
export const IOS_APPS: LaunchItem[] = LAUNCH_ITEMS.filter((l, i, a) => a.findIndex((x) => x.id === l.id) === i && !['sysprefs', 'mirroring', 'timemachine'].includes(l.id));
export const appById = (id: string) => IOS_APPS.find((a) => a.id === id);

/** iPhone names for Mac-only apps */
export function iosLabel(it: LaunchItem): string {
  if (it.id === 'finder') return 'Files';
  if (it.id === 'settings') return 'Settings';
  if (it.id === 'keynote') return 'Keynote';
  return it.label.replace(/^CV — Resume$/, 'CV').replace('System Settings', 'Settings').replace('Microsoft ', '');
}
export const iosIcon = (it: LaunchItem) => (it.id === 'finder' ? 'files' : it.icon);

/** v10.2 — iPhone Dock, left to right: Phone · Safari · Messages · Music */
export const DOCK_APPS = ['phone', 'safari', 'messages', 'music'] as const;
/** v10.2 — iPad Dock favourites (trimmed to fit the screen; recent apps and App Library follow) */
export const IPAD_DOCK = ['safari', 'messages', 'mail', 'music', 'photos', 'notes', 'calendar', 'finder', 'settings', 'hireme'] as const;

/* ───────────────────────── Home Screen layout ───────────────────────── */

export type WidgetSize = 's' | 'm' | 'l';
export type HomeItem =
  | { t: 'app'; id: string }
  | { t: 'widget'; id: string; w: string; size: WidgetSize; /** v10.3 — Smart Stack contents */ stack?: string[]; /** v10.3 — Smart Rotate */ rotate?: boolean }
  | { t: 'folder'; id: string; name: string; apps: string[] };

export interface HomeLayout {
  pages: HomeItem[][];
  hidden: number[];
  today: string[];
  v: number;
}

const app = (id: string): HomeItem => ({ t: 'app', id });
const wid = (w: string, size: WidgetSize): HomeItem => ({ t: 'widget', id: `${w}-${Math.random().toString(36).slice(2, 7)}`, w, size });

export const IOS_WIDGETS: { w: string; label: string; sizes: WidgetSize[]; icon: string }[] = [
  { w: 'profile', label: 'About Me', sizes: ['m', 's'], icon: 'about' },
  { w: 'weather', label: 'Weather', sizes: ['s', 'm'], icon: 'weather' },
  { w: 'calendar', label: 'Calendar', sizes: ['s', 'm'], icon: 'calendar' },
  { w: 'clock', label: 'Clock', sizes: ['s', 'm'], icon: 'clock' },
  { w: 'music', label: 'Music', sizes: ['m', 's'], icon: 'music' },
  { w: 'reminders', label: 'Reminders', sizes: ['s', 'm', 'l'], icon: 'reminders' },
  { w: 'photos', label: 'Photos', sizes: ['s', 'm', 'l'], icon: 'photos' },
  { w: 'battery', label: 'Batteries', sizes: ['s', 'm'], icon: 'battery' },
  { w: 'github', label: 'GitHub', sizes: ['s', 'm'], icon: 'github' },
  { w: 'projects', label: 'Projects', sizes: ['m', 'l'], icon: 'xcode' },
  { w: 'skills', label: 'Top Skills', sizes: ['s', 'm'], icon: 'notes' },
  { w: 'contact', label: 'Contact', sizes: ['s', 'm'], icon: 'contacts' },
  { w: 'screentime', label: 'Screen Time', sizes: ['s', 'm'], icon: 'activity' },
  { w: 'smart', label: 'Smart Stack', sizes: ['s', 'm'], icon: 'shortcuts' },
  { w: 'shortcuts', label: 'Shortcuts', sizes: ['s', 'm'], icon: 'shortcuts' },
];

export const FOLDERS: Record<string, string[]> = {
  Social: ['linkedin', 'instagram', 'facebook', 'threads', 'youtube', 'xapp', 'telegram', 'whatsapp', 'snapchat', 'discord', 'reddit', 'pinterest'],
  Developer: ['github', 'terminal', 'figma', 'w3schools', 'stackoverflow', 'canva', 'fontbook', 'grapher', 'colormeter', 'activity'],
  Google: ['google', 'gmail', 'drive', 'gphotos', 'classroom', 'playstore'],
  Office: ['word', 'excel', 'powerpoint', 'pages', 'numbers', 'keynote', 'textedit'],
  AI: ['askai', 'chatgpt', 'claude', 'gemini', 'deepseek'],
};

function defaultLayout(cols: number): HomeLayout {
  const p1: HomeItem[] = [
    wid('profile', 'm'),
    app('about'),
    app('projects'),
    app('skills'),
    app('experience'),
    wid('weather', 's'),
    wid('calendar', 's'),
    app('cv'),
    app('casestudies'),
    app('services'),
    app('hireme'),
  ];
  const p2: HomeItem[] = [
    wid('music', 'm'),
    app('education'),
    app('leadership'),
    app('timeline'),
    app('achievements'),
    app('calendar'),
    app('maps'),
    app('weather'),
    app('notes'),
    app('reminders'),
    app('contacts'),
    app('settings'),
    app('appstore'),
    { t: 'folder', id: 'f-social', name: 'Social', apps: FOLDERS.Social },
    { t: 'folder', id: 'f-dev', name: 'Developer', apps: FOLDERS.Developer },
    { t: 'folder', id: 'f-google', name: 'Google', apps: FOLDERS.Google },
    { t: 'folder', id: 'f-office', name: 'Office', apps: FOLDERS.Office },
  ];
  const used = new Set<string>([...DOCK_APPS, ...[p1, p2].flat().flatMap((i) => (i.t === 'app' ? [i.id] : i.t === 'folder' ? i.apps : []))]);
  const rest = IOS_APPS.map((a) => a.id).filter((id) => !used.has(id) && !FOLDERS.AI.includes(id));
  const p3: HomeItem[] = [wid('smart', 'm'), { t: 'folder', id: 'f-ai', name: 'AI', apps: FOLDERS.AI }, ...rest.slice(0, cols * 6 - 9).map(app)];
  const pages = [p1, p2, p3];
  // spill the remainder onto more pages
  let more = rest.slice(cols * 6 - 9);
  while (more.length) {
    pages.push(more.slice(0, cols * 6).map(app));
    more = more.slice(cols * 6);
  }
  return { pages, hidden: [], today: ['clock', 'weather', 'reminders', 'github', 'battery', 'screentime'], v: 1 };
}

const KEY = (mode: DeviceMode) => `mra-ios-layout-v10-${mode}`;
const EVT = 'mra-ios-layout';

export function loadLayout(mode: DeviceMode): HomeLayout {
  const cols = mode === 'ipad' ? 6 : 4;
  const st = readStore<HomeLayout | { v: 0 }>(KEY(mode), { v: 0 } as { v: 0 });
  if (!st || (st as HomeLayout).v !== 1 || !Array.isArray((st as HomeLayout).pages)) return defaultLayout(cols);
  const l = st as HomeLayout;
  // apps added in later versions show up on the last page
  const known = new Set(l.pages.flat().flatMap((i) => (i.t === 'app' ? [i.id] : i.t === 'folder' ? i.apps : [])));
  const missing = IOS_APPS.map((a) => a.id).filter((id) => !known.has(id) && !(DOCK_APPS as readonly string[]).includes(id) && !(l as HomeLayout & { removed?: string[] }).removed?.includes(id));
  if (missing.length) l.pages = [...l.pages, missing.map(app)];
  return l;
}

export function useHomeLayout(mode: DeviceMode): [HomeLayout & { removed?: string[] }, (u: (l: HomeLayout & { removed?: string[] }) => HomeLayout & { removed?: string[] }) => void, () => void] {
  const [l, setL] = useState(() => loadLayout(mode));
  useEffect(() => {
    setL(loadLayout(mode));
    const on = () => setL(loadLayout(mode));
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, [mode]);
  const set = (u: (l: HomeLayout & { removed?: string[] }) => HomeLayout & { removed?: string[] }) => {
    setL((cur) => {
      const next = u(cur);
      writeStore(KEY(mode), next);
      window.setTimeout(() => window.dispatchEvent(new Event(EVT)), 0);
      return next;
    });
  };
  const reset = () => {
    const d = defaultLayout(mode === 'ipad' ? 6 : 4);
    writeStore(KEY(mode), d);
    setL(d);
  };
  return [l, set, reset];
}

/** grid cells a page item takes (4 columns × 6 rows on iPhone) */
export const cellsOf = (i: HomeItem) => (i.t === 'widget' ? (i.size === 's' ? 4 : i.size === 'm' ? 8 : 16) : 1);
