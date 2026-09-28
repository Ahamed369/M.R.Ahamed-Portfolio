import { useCallback, useEffect, useState } from 'react';
import { readStore, writeStore } from './storage';
import { notify } from './notify';
import { playUi } from './sounds';
import type { IconName } from '../components/AppIcons';

/**
 * Personalisation shared by Launchpad, the Dock, Spotlight, the desktop
 * widgets and the Trash (Finder):
 *  - apps deleted from Launchpad (they go to the Trash and can be put back)
 *  - the order of Launchpad icons
 *  - which desktop widgets are shown, and in what order
 * Saved on this device only.
 */

export type WidgetId =
  | 'calendar'
  | 'clocks'
  | 'screentime'
  | 'weather'
  | 'github'
  | 'current'
  | 'music'
  | 'reminders'
  /* v9 — in the gallery only; visitors add them */
  | 'battery'
  | 'photoframe'
  | 'digital'
  | 'contact'
  | 'skills'
  | 'sysinfo'
  | 'services'
  | 'pomodoro'
  | 'quicknote';

export const WIDGETS: { id: WidgetId; label: string; icon: IconName; h: number }[] = [
  { id: 'calendar', label: 'Calendar', icon: 'calendar', h: 141 },
  { id: 'clocks', label: 'World Clock', icon: 'clock', h: 118 },
  { id: 'screentime', label: 'Screen Time', icon: 'screentime', h: 126 },
  { id: 'weather', label: 'Weather', icon: 'weather', h: 97 },
  { id: 'github', label: 'GitHub', icon: 'github', h: 121 },
  { id: 'current', label: 'Current Project', icon: 'xcode', h: 130 },
  { id: 'music', label: 'Music', icon: 'music', h: 138 },
  { id: 'reminders', label: 'Reminders', icon: 'reminders', h: 238 },
  { id: 'battery', label: 'Batteries', icon: 'battery', h: 96 },
  { id: 'photoframe', label: 'Photos', icon: 'photos', h: 160 },
  { id: 'digital', label: 'Digital Clock', icon: 'clock', h: 96 },
  { id: 'contact', label: 'Contact Card', icon: 'contacts', h: 150 },
  { id: 'skills', label: 'Top Skills', icon: 'star', h: 150 },
  { id: 'sysinfo', label: 'System Info', icon: 'activity', h: 130 },
  { id: 'services', label: 'My Services', icon: 'services', h: 160 },
  { id: 'pomodoro', label: 'Focus Timer', icon: 'screentime', h: 130 },
  { id: 'quicknote', label: 'Quick Note', icon: 'stickies', h: 150 },
];
/** v9 widgets appear in the gallery but are never placed automatically */
export const NEW_WIDGETS = new Set<WidgetId>(['battery', 'photoframe', 'digital', 'contact', 'skills', 'sysinfo', 'services', 'pomodoro', 'quicknote']);
export const DEFAULT_WIDGETS: WidgetId[] = ['calendar', 'clocks', 'screentime', 'weather', 'github', 'current', 'music', 'reminders'];

/** Launchpad items that can't be deleted (like Finder and System Settings on a Mac). */
export const PROTECTED_APPS = new Set(['finder', 'about', 'settings', 'appstore']);

export interface TrashItem {
  kind: 'app' | 'widget';
  id: string;
  label: string;
  icon: IconName;
  at: number;
}

interface State {
  removedApps: string[];
  order: string[];
  widgets: WidgetId[];
  trash: TrashItem[];
}

const KEY = 'mra-customize-v1';
const EVT = 'mra-customize';
const FALLBACK: State = { removedApps: [], order: [], widgets: DEFAULT_WIDGETS, trash: [] };

let cache: State | null = null;
const load = (): State => {
  if (!cache) {
    const s = readStore<State>(KEY, FALLBACK);
    const known = new Set<string>(WIDGETS.map((w) => w.id));
    cache = { ...s, widgets: (s.widgets ?? DEFAULT_WIDGETS).filter((w) => known.has(w)) };
  }
  return cache;
};
function save(next: State) {
  cache = next;
  writeStore(KEY, next);
  window.dispatchEvent(new Event(EVT));
}

export function useCustomize() {
  const [st, setSt] = useState<State>(load);
  useEffect(() => {
    const on = () => setSt(load());
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);

  const removeApp = useCallback((id: string, label: string, icon: IconName) => {
    const s = load();
    if (PROTECTED_APPS.has(id) || s.removedApps.includes(id)) return;
    save({ ...s, removedApps: [...s.removedApps, id], trash: [{ kind: 'app', id, label, icon, at: Date.now() }, ...s.trash.filter((t) => !(t.kind === 'app' && t.id === id))] });
    playUi();
    notify({ app: 'Launchpad', icon: 'trash', title: `“${label}” moved to the Trash`, body: 'Open the Trash to put it back.' });
  }, []);

  const removeWidget = useCallback((id: WidgetId) => {
    const s = load();
    const w = WIDGETS.find((x) => x.id === id);
    if (!w) return;
    save({ ...s, widgets: s.widgets.filter((x) => x !== id), trash: [{ kind: 'widget', id, label: `${w.label} widget`, icon: w.icon, at: Date.now() }, ...s.trash.filter((t) => !(t.kind === 'widget' && t.id === id))] });
    playUi();
    notify({ app: 'Widgets', icon: 'trash', title: `“${w.label}” widget moved to the Trash`, body: 'Put it back from the Trash or the widget gallery.' });
  }, []);

  const addWidget = useCallback((id: WidgetId) => {
    const s = load();
    if (s.widgets.includes(id)) return;
    save({ ...s, widgets: [...s.widgets, id], trash: s.trash.filter((t) => !(t.kind === 'widget' && t.id === id)) });
  }, []);

  const putBack = useCallback((item: TrashItem) => {
    const s = load();
    const trash = s.trash.filter((t) => !(t.kind === item.kind && t.id === item.id));
    if (item.kind === 'app') save({ ...s, removedApps: s.removedApps.filter((x) => x !== item.id), trash });
    else save({ ...s, widgets: s.widgets.includes(item.id as WidgetId) ? s.widgets : [...s.widgets, item.id as WidgetId], trash });
    notify({ app: 'Finder', icon: 'trash', title: `“${item.label}” put back` });
  }, []);

  /** Empty Trash: items stay hidden (they are not restorable any more) — "Restore defaults" brings everything back. */
  const emptyTrash = useCallback(() => {
    const s = load();
    save({ ...s, trash: [] });
    playUi();
  }, []);

  const setOrder = useCallback((order: string[]) => save({ ...load(), order }), []);
  const setWidgets = useCallback((widgets: WidgetId[]) => save({ ...load(), widgets }), []);
  const restoreDefaults = useCallback(() => save({ ...FALLBACK }), []);

  return { ...st, removeApp, removeWidget, addWidget, putBack, emptyTrash, setOrder, setWidgets, restoreDefaults };
}
